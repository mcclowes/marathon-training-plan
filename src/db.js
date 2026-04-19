import { db } from './firebase.js';
import {
  doc, setDoc, collection, getDocs, deleteDoc
} from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js';

export async function saveUserProfile(athlete) {
  await setDoc(doc(db, 'users', String(athlete.id)), {
    firstname: athlete.firstname,
    lastname: athlete.lastname,
    photo: athlete.profile_medium || athlete.profile || '',
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function savePlanToFirestore(athleteId, planId, plan, email, raceName) {
  await setDoc(doc(db, 'users', String(athleteId), 'plans', planId), {
    planId,
    email: email || '',
    raceName: raceName || plan.planMeta?.raceDistance || '',
    raceDate: plan.planMeta?.raceDate || '',
    distance: plan.planMeta?.raceDistance || '',
    createdAt: new Date().toISOString(),
    planData: JSON.stringify(plan),
    completions: '{}'
  });
}

export async function saveCompletionsToFirestore(athleteId, planId, completions) {
  await setDoc(
    doc(db, 'users', String(athleteId), 'plans', planId),
    { completions: JSON.stringify(completions) },
    { merge: true }
  );
}

export async function loadPlansFromFirestore(athleteId) {
  const snapshot = await getDocs(collection(db, 'users', String(athleteId), 'plans'));
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      planId: data.planId,
      email: data.email,
      raceName: data.raceName,
      raceDate: data.raceDate,
      distance: data.distance,
      createdAt: data.createdAt,
      plan: data.planData ? JSON.parse(data.planData) : null,
      completions: data.completions ? JSON.parse(data.completions) : {}
    };
  });
}

export async function deletePlanFromFirestore(athleteId, planId) {
  await deleteDoc(doc(db, 'users', String(athleteId), 'plans', planId));
}
