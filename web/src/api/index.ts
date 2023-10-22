const URLPath = 'https://shoppingo-api.onrender.com';

export async function getItems() {
    const response = await fetch(`${URLPath}/items`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return await response.json();
}
