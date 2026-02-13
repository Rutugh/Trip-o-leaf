import {
  collection,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  or,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export interface Trip {
  id?: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  ownerId: string;
  ownerName?: string; // Store owner's name for display
  ownerEmail?: string; // Store owner's email
  sharedWith: string[]; // Array of emails
  splitCount?: number;
  createdAt?: Timestamp;
}

// ✅ Create Real Trip
export const createTrip = async (
  user: any,
  trip: Omit<Trip, "id" | "ownerId" | "sharedWith" | "createdAt" | "splitCount" | "ownerName" | "ownerEmail">
) => {
  try {
    console.log("User UID:", user?.uid);
    console.log("Trip Data:", trip);

    const docRef = await addDoc(collection(db, "trips"), {
      ...trip,
      ownerId: user.uid,
      ownerName: user.displayName || user.email,
      ownerEmail: user.email,
      sharedWith: [],
      splitCount: 1,
      createdAt: Timestamp.now(),
    });

    console.log("Trip created with ID:", docRef.id);
    return docRef;

  } catch (error) {
    console.error("Error creating trip:", error);
    throw error;
  }
};


// ✅ Share Trip (No Email - Just Firestore)
export const shareTrip = async (tripId: string, email: string, currentUser: any) => {
  const tripRef = doc(db, "trips", tripId);
  
  // Get current trip data
  const tripSnap = await getDoc(tripRef);
  
  if (!tripSnap.exists()) {
    throw new Error("Trip not found");
  }

  const tripData = tripSnap.data();
  const currentSharedWith = tripData.sharedWith || [];

  // Check if already shared
  if (currentSharedWith.includes(email)) {
    throw new Error("Trip already shared with this user");
  }

  // Check if trying to share with yourself
  if (email === currentUser.email) {
    throw new Error("You cannot share a trip with yourself");
  }

  // Update trip in Firestore
  await updateDoc(tripRef, {
    sharedWith: arrayUnion(email),
    splitCount: (tripData.splitCount || 1) + 1,
  });

  // That's it! When the user with this email logs in, they'll see the trip
  console.log(`Trip shared with ${email}. They'll see it when they log in.`);
};

// ✅ Unshare Trip
export const unshareTrip = async (tripId: string, email: string) => {
  const tripRef = doc(db, "trips", tripId);
  const tripSnap = await getDoc(tripRef);
  
  if (!tripSnap.exists()) {
    throw new Error("Trip not found");
  }

  const tripData = tripSnap.data();
  const currentSplitCount = tripData.splitCount || 1;

  await updateDoc(tripRef, {
    sharedWith: arrayRemove(email),
    splitCount: Math.max(1, currentSplitCount - 1),
  });
};

// ✅ Get Trips (Owned + Shared)
export const getTrips = async (user: any): Promise<Trip[]> => {
  const tripsRef = collection(db, "trips");

  const q = query(
    tripsRef,
    or(
      where("ownerId", "==", user.uid),
      where("sharedWith", "array-contains", user.email)
    ),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Trip[];
};

// ✅ Delete Trip
export const deleteTrip = async (tripId: string) => {
  await deleteDoc(doc(db, "trips", tripId));
};