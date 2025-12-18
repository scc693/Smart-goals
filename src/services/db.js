import { db } from "../firebase";
import {
    collection,
    doc,
    setDoc,
    addDoc,
    getDoc,
    updateDoc,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    serverTimestamp,
    increment,
    onSnapshot,
    arrayUnion
} from "firebase/firestore";

/**
 * Data Models:
 *
 * User:
 * - uid (string): Primary Key
 * - email (string)
 * - displayName (string)
 * - currentPoints (number)
 * - groupIds (array of strings)
 *
 * Group:
 * - id (string): Primary Key
 * - name (string)
 * - adminIds (array of strings)
 * - memberIds (array of strings)
 * - awards (array of objects): { id, name, cost, description }
 *
 * Goal:
 * - id (string): Primary Key
 * - userId (string)
 * - groupId (string | null) - Null if private individual goal
 * - title (string)
 * - description (string)
 * - progress (number) - 0 to 100
 * - isPrivate (boolean)
 * - excludeFromLeaderboard (boolean)
 * - deadline (timestamp | null)
 * - subGoals (array of objects):
 *      { id, title, completed, steps: [{ id, title, completed }] }
 * - points (number) - Points awarded upon completion
 * - completed (boolean)
 * - lastModifiedBy (string) - UID of last editor
 * - lastModifiedAt (timestamp)
 */

// User Functions
export async function createUser(uid, email, displayName) {
    const userRef = doc(db, "users", uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        await setDoc(userRef, {
            uid,
            email,
            displayName,
            currentPoints: 0,
            groupIds: [],
            createdAt: serverTimestamp()
        });
    }
}

export async function getUser(uid) {
    const userRef = doc(db, "users", uid);
    const snapshot = await getDoc(userRef);
    return snapshot.exists() ? snapshot.data() : null;
}

// Group Functions
export async function createGroup(name, adminUid) {
    const groupRef = await addDoc(collection(db, "groups"), {
        name,
        adminIds: [adminUid],
        memberIds: [adminUid],
        awards: [],
        createdAt: serverTimestamp()
    });

    // Add group ID to user's profile
    const userRef = doc(db, "users", adminUid);
    await updateDoc(userRef, {
        groupIds: arrayUnion(groupRef.id)
    });

    return groupRef.id;
}

export async function joinGroup(groupId, uid) {
    const groupRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupRef);

    if (!groupSnap.exists()) {
        throw new Error("Group not found");
    }

    const userRef = doc(db, "users", uid);

    await updateDoc(groupRef, {
        memberIds: arrayUnion(uid)
    });

    await updateDoc(userRef, {
        groupIds: arrayUnion(groupId)
    });
}

export async function getGroup(groupId) {
    const groupRef = doc(db, "groups", groupId);
    const snapshot = await getDoc(groupRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export function subscribeToGroup(groupId, callback) {
    return onSnapshot(doc(db, "groups", groupId), (doc) => {
        callback({ id: doc.id, ...doc.data() });
    });
}

// Goal Functions
export function subscribeToGoals(userId, callback) {
    const q = query(collection(db, "goals"), where("userId", "==", userId));
    return onSnapshot(q, (querySnapshot) => {
        const goals = [];
        querySnapshot.forEach((doc) => {
            goals.push({ id: doc.id, ...doc.data() });
        });
        callback(goals);
    });
}

export async function addGoal(goalData) {
    // goalData should include userId, title, etc.
    const cleanData = {
        ...goalData,
        progress: 0,
        completed: false,
        createdAt: serverTimestamp(),
        lastModifiedAt: serverTimestamp()
    };
    return await addDoc(collection(db, "goals"), cleanData);
}

export async function updateGoal(goalId, updates, uid) {
    const goalRef = doc(db, "goals", goalId);

    // Simple Last Write Wins
    const cleanUpdates = {
        ...updates,
        lastModifiedBy: uid,
        lastModifiedAt: serverTimestamp()
    };

    await updateDoc(goalRef, cleanUpdates);
}

export async function deleteGoal(goalId) {
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "goals", goalId));
}

// Leaderboard
export function subscribeToLeaderboard(callback) {
    // For MVP, global leaderboard of all users (or filter client side if group ID is needed)
    // Real app would query by group membership.
    // Here we just get top 50 users by points
    const q = query(collection(db, "users"), orderBy("currentPoints", "desc"), limit(50));
    return onSnapshot(q, (querySnapshot) => {
        const users = [];
        querySnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });
        callback(users);
    });
}

export function subscribeToGroupLeaderboard(memberIds, callback) {
    // Firestore "in" query limits to 10 items. For larger groups, better to query all users and filter client side
    // or store limited data in the group doc.
    // For MVP with small groups, we can fetch all users who are in the member list.
    if (!memberIds || memberIds.length === 0) {
        callback([]);
        return () => {};
    }

    // "in" query supports up to 10. For now let's query all users and filter client side is safer for dynamic sizes
    // But efficiently:
    const q = query(collection(db, "users"), where("uid", "in", memberIds.slice(0, 10)));
    // Note: This is a limitation. If group > 10, this breaks.
    // Alternative: fetch all users and filter.

    return onSnapshot(q, (querySnapshot) => {
        const users = [];
        querySnapshot.forEach((doc) => {
             users.push({ id: doc.id, ...doc.data() });
        });
        // Sort by points desc
        users.sort((a, b) => (b.currentPoints || 0) - (a.currentPoints || 0));
        callback(users);
    });
}


// Points Logic (Simplified for MVP)
export async function addPoints(uid, amount) {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
        currentPoints: increment(amount)
    });
}
