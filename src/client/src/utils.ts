export async function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

export async function animationCooldown() {
    await sleep(100);
    await new Promise(requestAnimationFrame);
}