// utils/storage.ts

import { API_KEY_COOKIE_NAME } from './constants';

export function setCookie(name: string, value: string, days: number) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = `${name}=${value || ""}${expires}; path=/; SameSite=Lax`;
}

export function getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

export function saveSettingsToLocal(key: string, settings: any) {
    try {
        localStorage.setItem(key, JSON.stringify(settings));
    } catch (e) {
        console.error("Error saving settings to local storage:", e);
    }
}

export function getSettingsFromLocal(key: string): any | null {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        console.error("Error loading settings from local storage:", e);
        return null;
    }
}

export function setWelcomeShown(shown: boolean) {
    localStorage.setItem('englishLearnerWelcomeShown_v1', String(shown));
}

export function getWelcomeShown(): boolean {
    return localStorage.getItem('englishLearnerWelcomeShown_v1') === 'true';
}

export function getApiKeyFromCookie(): string | null {
    return getCookie(API_KEY_COOKIE_NAME);
}

export function saveApiKeyToCookie(key: string) {
    setCookie(API_KEY_COOKIE_NAME, key, 365); // Store for 1 year
}

export function clearApiKeyCookie() {
    setCookie(API_KEY_COOKIE_NAME, '', -1); // Expire immediately
}