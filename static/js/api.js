// Handles all network requests
export async function fetchUpload(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/upload', { method: 'POST', body: formData });
    return await response.json();
}

export async function fetchRender(payload) {
    const response = await fetch('/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return await response.json();
}