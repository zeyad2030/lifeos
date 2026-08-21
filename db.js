const DB_NAME = "OrganizationDB";
const DB_VERSION = 1;

let db;

function openDB() {
    return new Promise((resolve, reject) => {

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {

            const database = event.target.result;

            if (!database.objectStoreNames.contains("tasks")) {
                const tasks = database.createObjectStore("tasks", {
                    keyPath: "id",
                    autoIncrement: true
                });

                tasks.createIndex("completed", "completed");
                tasks.createIndex("daily", "daily");
            }

            if (!database.objectStoreNames.contains("notes")) {
                database.createObjectStore("notes", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }

            if (!database.objectStoreNames.contains("finance")) {
                database.createObjectStore("finance", {
                    keyPath: "id"
                });
            }
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}
async function getAll(storeName) {

    await openDB();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);

        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };

    });
}


async function addItem(storeName, data) {

    await openDB();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);

        const request = store.add(data);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };

    });
}


async function updateItem(storeName, data) {

    await openDB();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);

        const request = store.put(data);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };

    });
}


async function deleteItem(storeName, id) {

    await openDB();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);

        const request = store.delete(id);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            reject(request.error);
        };

    });
}