/**
 * Utility functions for file handling
 */

/**
 * Compute a hash for a file to use as a unique identifier
 * Uses a simple hash algorithm (FNV-1a) to avoid dependencies
 */
export async function computeFileHash(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            if (!event.target || !event.target.result) {
                reject(new Error('Failed to read file'));
                return;
            }

            const content = event.target.result as string;
            // FNV-1a hash algorithm
            const hash = fnv1a(content);
            resolve(hash);
        };

        reader.onerror = () => {
            reject(new Error('Error reading file'));
        };

        reader.readAsText(file);
    });
}

/**
 * Implementation of FNV-1a hash algorithm
 * Simple, fast algorithm for string hashing
 */
function fnv1a(str: string): string {
    const FNV_PRIME = 0x01000193;
    const FNV_OFFSET_BASIS = 0x811c9dc5;

    let hash = FNV_OFFSET_BASIS;

    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, FNV_PRIME);
    }

    // Convert to hex string
    return (hash >>> 0).toString(16);
}

/**
 * Read a file and return its contents
 */
export function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            if (!event.target || !event.target.result) {
                reject(new Error('Failed to read file'));
                return;
            }

            resolve(event.target.result as string);
        };

        reader.onerror = () => {
            reject(new Error('Error reading file'));
        };

        reader.readAsText(file);
    });
} 