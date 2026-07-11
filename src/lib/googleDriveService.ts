// Google Drive Service for OKEY Expense Management
// Coordinates folder creations, standard structures, and uploads

export interface DriveFolderCache {
  rootId?: string;
  signatureId?: string;
  receiptId?: string;
  requestPdfId?: string;
  approvedPdfId?: string;
  replacementId?: string;
  attachmentId?: string;
  auditId?: string;
}

// Helper to convert base64 to Blob
export function base64ToBlob(base64: string, contentType: string): Blob {
  const byteString = atob(base64.split(',')[1] || base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: contentType });
}

// Retrieve cached folder IDs or empty object
export function getCachedFolders(): DriveFolderCache {
  const data = localStorage.getItem('okey_drive_folders');
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  }
  return {};
}

// Save folder cache
export function saveCachedFolders(cache: DriveFolderCache) {
  localStorage.setItem('okey_drive_folders', JSON.stringify(cache));
}

// REST call helper to search file/folder
async function searchFolder(accessToken: string, name: string, parentId?: string): Promise<string | null> {
  let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

// REST call helper to create a folder
async function createFolder(accessToken: string, name: string, parentId?: string): Promise<string> {
  const metadata: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) {
    metadata.parents = [parentId];
  }
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });
  if (!res.ok) {
    throw new Error(`Failed to create folder ${name}`);
  }
  const data = await res.json();
  return data.id;
}

// Publicize file/folder permission to "anyone with link can read" so preview inside iframe works
export async function shareFilePublicly(accessToken: string, fileId: string) {
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (e) {
    console.error('Error sharing file publicly', e);
  }
}

// Initialize the OKEY Expense Management Drive hierarchy
export async function initDriveStructure(accessToken: string): Promise<DriveFolderCache> {
  const cache = getCachedFolders();
  
  // 1. Verify root folder
  let rootId = cache.rootId || null;
  if (rootId) {
    // Check if it still exists
    const checkUrl = `https://www.googleapis.com/drive/v3/files/${rootId}?fields=id,trashed`;
    const checkRes = await fetch(checkUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!checkRes.ok) {
      rootId = null; // Stale cache
    }
  }

  if (!rootId) {
    rootId = await searchFolder(accessToken, 'OKEY Expense Management');
    if (!rootId) {
      rootId = await createFolder(accessToken, 'OKEY Expense Management');
    }
  }

  // Helper to resolve standard subfolders
  const getOrCreateSubfolder = async (name: string, cacheKey: keyof DriveFolderCache): Promise<string> => {
    let subId = cache[cacheKey];
    if (subId) {
      const checkRes = await fetch(`https://www.googleapis.com/drive/v3/files/${subId}?fields=id,trashed`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!checkRes.ok) subId = undefined;
    }
    if (!subId) {
      subId = await searchFolder(accessToken, name, rootId!) || undefined;
      if (!subId) {
        subId = await createFolder(accessToken, name, rootId!);
        await shareFilePublicly(accessToken, subId);
      }
    }
    return subId!;
  };

  const updatedCache: DriveFolderCache = {
    rootId: rootId!,
    signatureId: await getOrCreateSubfolder('01_UserSignature', 'signatureId'),
    receiptId: await getOrCreateSubfolder('02_Receipt', 'receiptId'),
    requestPdfId: await getOrCreateSubfolder('03_RequestPDF', 'requestPdfId'),
    approvedPdfId: await getOrCreateSubfolder('04_ApprovedPDF', 'approvedPdfId'),
    replacementId: await getOrCreateSubfolder('05_ReplacementReceipt', 'replacementId'),
    attachmentId: await getOrCreateSubfolder('06_Attachment', 'attachmentId'),
    auditId: await getOrCreateSubfolder('07_Audit', 'auditId'),
  };

  saveCachedFolders(updatedCache);
  return updatedCache;
}

// Centralized Multipart uploader
export async function uploadFileToDrive(
  accessToken: string,
  fileName: string,
  mimeType: string,
  fileBlob: Blob,
  parentFolderId: string
): Promise<{ id: string; url: string }> {
  const metadata = {
    name: fileName,
    parents: [parentFolderId]
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', fileBlob);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: form
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to upload to Google Drive: ${errText}`);
  }

  const data = await res.json();
  await shareFilePublicly(accessToken, data.id);

  // Return previewable URL
  return {
    id: data.id,
    url: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view?usp=drivesdk`
  };
}

// Specialized upload helpers
export async function uploadUserSignature(
  accessToken: string,
  employeeId: string,
  base64Data: string
): Promise<{ id: string; url: string; createdAt: string }> {
  const folders = await initDriveStructure(accessToken);
  const blob = base64ToBlob(base64Data, 'image/png');
  const result = await uploadFileToDrive(accessToken, `signature_${employeeId}.png`, 'image/png', blob, folders.signatureId!);
  return {
    id: result.id,
    url: result.url,
    createdAt: new Date().toISOString()
  };
}

export async function uploadReceiptFile(
  accessToken: string,
  requestNumber: string,
  fileName: string,
  fileBlob: Blob,
  mimeType: string
): Promise<{ id: string; url: string; folderId: string }> {
  const folders = await initDriveStructure(accessToken);
  
  // Search or create subfolder under 02_Receipt named after requestNumber
  let reqFolderId = await searchFolder(accessToken, requestNumber, folders.receiptId!);
  if (!reqFolderId) {
    reqFolderId = await createFolder(accessToken, requestNumber, folders.receiptId!);
    await shareFilePublicly(accessToken, reqFolderId);
  }

  const result = await uploadFileToDrive(accessToken, fileName, mimeType, fileBlob, reqFolderId);
  return {
    id: result.id,
    url: result.url,
    folderId: reqFolderId
  };
}

export async function uploadRequestPdfFile(
  accessToken: string,
  requestNumber: string,
  fileName: string,
  fileBlob: Blob
): Promise<{ id: string; url: string }> {
  const folders = await initDriveStructure(accessToken);
  return await uploadFileToDrive(accessToken, fileName, 'application/pdf', fileBlob, folders.requestPdfId!);
}

export async function uploadApprovedPdfFile(
  accessToken: string,
  requestNumber: string,
  fileName: string,
  fileBlob: Blob
): Promise<{ id: string; url: string }> {
  const folders = await initDriveStructure(accessToken);
  return await uploadFileToDrive(accessToken, fileName, 'application/pdf', fileBlob, folders.approvedPdfId!);
}

export async function uploadReplacementReceiptFile(
  accessToken: string,
  requestNumber: string,
  fileName: string,
  fileBlob: Blob
): Promise<{ id: string; url: string }> {
  const folders = await initDriveStructure(accessToken);
  return await uploadFileToDrive(accessToken, fileName, 'application/pdf', fileBlob, folders.replacementId!);
}

export async function uploadAttachmentFile(
  accessToken: string,
  requestNumber: string,
  fileName: string,
  fileBlob: Blob,
  mimeType: string
): Promise<{ id: string; url: string }> {
  const folders = await initDriveStructure(accessToken);
  return await uploadFileToDrive(accessToken, fileName, mimeType, fileBlob, folders.attachmentId!);
}

export async function uploadAuditFile(
  accessToken: string,
  fileName: string,
  fileBlob: Blob,
  mimeType: string
): Promise<{ id: string; url: string }> {
  const folders = await initDriveStructure(accessToken);
  return await uploadFileToDrive(accessToken, fileName, mimeType, fileBlob, folders.auditId!);
}
