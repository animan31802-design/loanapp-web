import {
  collection as fsCollection,
  doc as fsDoc,
  getDoc as fsGetDoc,
  setDoc as fsSetDoc,
  updateDoc as fsUpdateDoc,
  deleteDoc as fsDeleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  addDoc as fsAddDoc,
  serverTimestamp as fsServerTimestamp,
  increment as fsIncrement,
  runTransaction as fsRunTransaction,
  Transaction,
  onSnapshot,
  DocumentData,
  QueryConstraint,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppConfig } from "@/constants/AppConfig";

export { db };
export const increment = fsIncrement;
export const firestoreDoc = (col: string, id: string) => fsDoc(db, col, id);
export const firestoreCollection = (col: string) => fsCollection(db, col);
export const COLLECTIONS = AppConfig.COLLECTIONS;

// Convert Firestore Timestamps to JS Dates recursively
export const convertTimestamps = (data: DocumentData): DocumentData => {
  const result: DocumentData = {};
  for (const key in data) {
    const val = data[key];
    if (val instanceof Timestamp) {
      result[key] = val.toDate();
    } else if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      result[key] = convertTimestamps(val);
    } else {
      result[key] = val;
    }
  }
  return result;
};

export const getDoc = async (col: string, id: string): Promise<DocumentData | null> => {
  const snap = await fsGetDoc(fsDoc(db, col, id));
  if (!snap.exists()) return null;
  return convertTimestamps({ id: snap.id, ...snap.data() });
};

export const setDoc = async (col: string, id: string, data: DocumentData): Promise<void> => {
  await fsSetDoc(fsDoc(db, col, id), data);
};

export const updateDoc = async (col: string, id: string, data: DocumentData): Promise<void> => {
  await fsUpdateDoc(fsDoc(db, col, id), data);
};

export const deleteDoc = async (col: string, id: string): Promise<void> => {
  await fsDeleteDoc(fsDoc(db, col, id));
};

export const addDoc = async (col: string, data: DocumentData): Promise<string> => {
  const ref = await fsAddDoc(fsCollection(db, col), data);
  return ref.id;
};

export const queryDocs = async (
  col: string,
  filters: { field: string; op: string; value: unknown }[] = [],
  orderByField?: string,
  direction: "asc" | "desc" = "asc"
): Promise<DocumentData[]> => {
  const constraints: QueryConstraint[] = filters.map((f) =>
    where(f.field, f.op as never, f.value)
  );
  if (orderByField) constraints.push(orderBy(orderByField, direction));
  const snap = await getDocs(query(fsCollection(db, col), ...constraints));
  return snap.docs.map((d) => convertTimestamps({ id: d.id, ...d.data() }));
};

export const generateId = (col: string): string => {
  return fsDoc(fsCollection(db, col)).id;
};

export const serverTimestamp = () => fsServerTimestamp();

export const runTransaction = <T>(
  updateFunction: (transaction: Transaction) => Promise<T>
): Promise<T> => {
  return fsRunTransaction(db, updateFunction);
};

export const onSnapshotDoc = (
  col: string,
  id: string,
  callback: (data: DocumentData) => void
) => {
  return onSnapshot(fsDoc(db, col, id), (snap) => {
    if (snap.exists()) callback(convertTimestamps({ id: snap.id, ...snap.data() }));
  });
};
