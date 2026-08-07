import { storage } from '../firebase';
import { ref, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';

export async function uploadToStorage(path: string, dataUrlOrFile: string | File): Promise<string> {
  try {
    const fileRef = ref(storage, path);
    
    if (typeof dataUrlOrFile === 'string') {
      await uploadString(fileRef, dataUrlOrFile, 'data_url');
    } else {
      await uploadBytes(fileRef, dataUrlOrFile);
    }
    
    return await getDownloadURL(fileRef);
  } catch (err) {
    console.warn('Firebase Storage upload failed, falling back to local Data URL:', err);
    if (typeof dataUrlOrFile === 'string') {
      return dataUrlOrFile;
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(dataUrlOrFile);
    });
  }
}

