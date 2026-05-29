export interface UserProfile {
  id: string;
  displayName: string;
  studentNumber: string;
  role: "master" | "admin" | "reviewer" | "normal";
  email?: string;
}
