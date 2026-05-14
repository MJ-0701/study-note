export interface UserProfile {
  id: string;
  displayName: string;
  studentNumber: string;
  role: "master" | "admin" | "normal";
  email?: string;
}
