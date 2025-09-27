// requestService.js
// Mock service to manage caregiver service requests.
// Replace with real API calls later.

let _requests = [
    { id: 1, family: 'Johnson Family', service: 'Elder Care', duration: '3 months', rate: 25, unit: 'hour', urgent: true, status: 'new', notes: 'Assist with daily activities' },
    { id: 2, family: 'Brown Family', service: 'Post-Surgery Care', duration: '2 weeks', rate: 30, unit: 'hour', urgent: false, status: 'new', notes: 'Focus on mobility support' },
    { id: 3, family: 'Wilson Family', service: 'Companion Care', duration: '6 months', rate: 22, unit: 'hour', urgent: false, status: 'new', notes: 'Daily companionship and light chores' },
    { id: 4, family: 'Garcia Family', service: 'Medication Management', duration: '1 month', rate: 28, unit: 'hour', urgent: true, status: 'new', notes: 'Ensure meds at 8am and 8pm' }
];
let _idCounter = 5;

function delay(ms = 250) { return new Promise(r => setTimeout(r, ms)); }

export async function listRequests({ status } = {}) {
    await delay();
    let list = [..._requests];
    if (status && status !== 'all') list = list.filter(r => r.status === status);
    return list.sort((a, b) => a.id - b.id);
}

export async function updateRequestStatus(id, status) {
    await delay();
    const idx = _requests.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Request not found');
    _requests[idx] = { ..._requests[idx], status };
    return _requests[idx];
}

export async function addRequest(req) {
    await delay();
    const newReq = { id: _idCounter++, status: 'new', urgent: false, ...req };
    _requests.push(newReq);
    return newReq;
}

export async function deleteRequest(id) {
    await delay();
    _requests = _requests.filter(r => r.id !== id);
    return true;
}
