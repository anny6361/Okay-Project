const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Imports
content = content.replace("import React, { useState, useEffect, useMemo } from 'react';", 
`import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { setupFirestoreSync, setGlobalRenderTrigger, DB_CACHE, saveToFirestore, getFromCache } from './lib/firestore-sync';
import { migrateLocalToFirestore } from './lib/migration';
import { getDbUsers } from './data/db';`);

// State declarations
content = content.replace("const [isSessionChecking, setIsSessionChecking] = useState(true);",
`const [isSessionChecking, setIsSessionChecking] = useState(true);
  const [syncCounter, setSyncCounter] = useState(0);`);

// Replace loadDatabase completely
// The original loadDatabase reads from localStorage and does some logic. We will replace the body.
content = content.replace(/const loadDatabase = \(\) => \{[\s\S]*?\};(\s*\/\/ Save state to localStorage)/,
`const loadDatabase = useCallback(() => {
    // Derived from DB_CACHE due to real-time sync
    const dbUsers = getDbUsers();
    setUsersList(dbUsers);
    
    // Auto-sync current user from Auth
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
$1`);

// Replace saveState to localStorage to use saveToFirestore
content = content.replace(/const saveState = \([\s\S]*?\/\/ Check if user session exists[\s\S]*?useEffect\(\(\) => \{/m,
`const saveState = (updatedRequests: ExpenseRequest[], updatedBudgets?: DepartmentBudget[]) => {
    setRequests(updatedRequests);
    saveToFirestore('okey_requests', updatedRequests);

    if (updatedBudgets) {
      // It's not straightforward to save back budgets to departments directly here if we only have budgets
      // We will skip budget update here and rely on recalculation, or we can save them if needed
    }
  };

  // Session effect removed as it's handled by onAuthStateChanged
  useEffect(() => {`);

// Remove handleLogout's localStorage logic
content = content.replace(/const handleLogout = \(\) => \{[\s\S]*?setIsSessionChecking\(false\);\n  \};/,
`const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUsersList([]);
    setRequests([]);
    setBudgets([]);
  };`);

// Remove manual session checks in handleLoginSuccess
content = content.replace(/const handleLoginSuccess = \(user: UserProfile, rememberMe: boolean\) => \{[\s\S]*?setIsSessionChecking\(false\);\n  \};/,
`const handleLoginSuccess = (user: UserProfile, rememberMe: boolean) => {
    setCurrentUser(user);
    setIsSessionChecking(false);
  };`);


fs.writeFileSync('src/App.tsx', content);
