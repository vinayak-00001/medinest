import { Role } from "./types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+\d][\d\s-]{7,19}$/;
const passwordLetterPattern = /[A-Za-z]/;
const passwordNumberPattern = /\d/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateEmail(email: string) {
  return emailPattern.test(normalizeEmail(email));
}

export function validatePhone(phone: string) {
  return phonePattern.test(phone.trim());
}

export function validatePassword(password: string) {
  return password.length >= 8 && passwordLetterPattern.test(password) && passwordNumberPattern.test(password);
}

export function validateRole(role: string): role is Role {
  return role === "patient" || role === "doctor" || role === "admin";
}
