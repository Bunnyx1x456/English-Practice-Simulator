// utils/debounce.ts

export function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number): (...args: Parameters<F>) => ReturnType<F> {
    let timeout: number | undefined;

    // Return a new function that acts as the debounced version
    // This debounced function should always resolve with the actual function's return value
    // For functions that return Promises, this needs careful handling or separate debounce.
    // For now, assuming synchronous or fire-and-forget for simplicity of this example.
    const debounced = function (this: any, ...args: Parameters<F>) {
        const context = this;
        const later = () => {
            timeout = undefined;
            func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = window.setTimeout(later, waitFor);
    };

    // Add a way to immediately call the debounced function if needed,
    // and clear any pending timeouts. useful for cleanup/tests.
    (debounced as any).cancel = () => {
        clearTimeout(timeout);
        timeout = undefined;
    };

    return debounced as (...args: Parameters<F>) => ReturnType<F>;
}