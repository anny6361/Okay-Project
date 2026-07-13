const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace loadDatabase function entirely
const loadDatabaseStart = content.indexOf('const loadDatabase = () => {');
const saveStateStart = content.indexOf('// Save state to localStorage');
if (loadDatabaseStart > -1 && saveStateStart > -1) {
  content = content.substring(0, loadDatabaseStart) +
`const loadDatabase = useCallback(() => {
    const dbUsers = getDbUsers();
    setUsersList(dbUsers);
    
    const fbUser = auth.currentUser;
    if (fbUser && fbUser.email) {
      const matchedUser = dbUsers.find(u => u.email === fbUser.email || (u.username + '@okey.com').toLowerCase() === fbUser.email.toLowerCase());
      if (matchedUser && matchedUser.is_active) {
        setCurrentUser(matchedUser);
      }
    }

    const savedRequests = getFromCache('okey_requests', []);
    const savedBudgets = getFromCache('okey_budgets', []);
    setRequests(savedRequests);
    setBudgets(savedBudgets);
    setIsLoaded(true);
  }, [syncCounter]);

  useEffect(() => {
    setGlobalRenderTrigger(() => setSyncCounter(c => c + 1));
    setupFirestoreSync();
    migrateLocalToFirestore().catch(console.error);
    
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsSessionChecking(false);
      setSyncCounter(c => c + 1); // trigger reload
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    loadDatabase();
  }, [loadDatabase]);

  ` + content.substring(saveStateStart);
}

// Replace saveState function entirely
const saveStateRegex = /const saveState = \([^)]*\) => \{[\s\S]*?\};\s*\/\/ Check if user session exists/m;
content = content.replace(saveStateRegex, 
`const saveState = (updatedRequests: ExpenseRequest[], updatedBudgets?: DepartmentBudget[]) => {
    setRequests(updatedRequests);
    saveToFirestore('okey_requests', updatedRequests);
    if (updatedBudgets) {
      setBudgets(updatedBudgets);
    }
  };

  // Check if user session exists (replaced by Auth listener above)`);

// Replace handleLogout entirely
const handleLogoutRegex = /const handleLogout = \(\) => \{[\s\S]*?setIsSessionChecking\(false\);\n  \};/m;
content = content.replace(handleLogoutRegex, 
`const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUsersList([]);
    setRequests([]);
    setBudgets([]);
  };`);

// Replace handleLoginSuccess entirely
const handleLoginSuccessRegex = /const handleLoginSuccess = \(user: UserProfile, rememberMe: boolean\) => \{[\s\S]*?setIsSessionChecking\(false\);\n  \};/m;
content = content.replace(handleLoginSuccessRegex, 
`const handleLoginSuccess = (user: UserProfile, rememberMe: boolean) => {
    setCurrentUser(user);
    setIsSessionChecking(false);
  };`);

// Also fix imports
content = content.replace("import React, { useState, useEffect, useMemo } from 'react';", 
`import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { setupFirestoreSync, setGlobalRenderTrigger, DB_CACHE, saveToFirestore, getFromCache } from './lib/firestore-sync';
import { migrateLocalToFirestore } from './lib/migration';
import { getDbUsers } from './data/db';`);

content = content.replace("const [isSessionChecking, setIsSessionChecking] = useState(true);",
`const [isSessionChecking, setIsSessionChecking] = useState(true);
  const [syncCounter, setSyncCounter] = useState(0);`);

fs.writeFileSync('src/App.tsx', content);
