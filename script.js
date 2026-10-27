import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL =
    "https://aftksymubblyormajxiq.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_4taWqjzl8zNutqKeAjJZUQ_r7l4sc_P";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

const STORAGE_BUCKET = "FIR Documents";
const FIR_TABLE = "firs";

const LM_STUDIO_URL =
    "http://localhost:1234/v1/chat/completions";

const LM_STUDIO_MODELS_URL =
    "http://localhost:1234/v1/models";

const LM_STUDIO_MODEL =
    "qwen2.5-7b-instruct";

let selectedAIFeature = "";
let selectedAIFIR = "";

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        await loadFIRs();
        await loadTracking();
        await loadAIFIRList();
    }
);

function escapeHTML(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function normalizeStatus(status) {
    const value =
        String(status || "Filed")
            .trim()
            .toLowerCase();

    if (value === "investigation") {
        return "Investigation";
    }

    if (value === "pending") {
        return "Pending";
    }

    if (value === "closed") {
        return "Closed";
    }

    return "Filed";
}

function normalizePriority(priority) {
    const value =
        String(priority || "Medium")
            .trim()
            .toLowerCase();

    if (value === "high") {
        return "High";
    }

    if (value === "low") {
        return "Low";
    }

    return "Medium";
}

function getStatusClass(status) {
    return normalizeStatus(status)
        .toLowerCase()
        .replace(/\s+/g, "-");
}

function getPriorityClass(priority) {
    return normalizePriority(priority)
        .toLowerCase();
}

function formatDate(dateValue) {
    if (!dateValue) {
        return "-";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return String(dateValue);
    }

    return date.toLocaleDateString("en-GB");
}

function normalizeStoragePath(filePath) {
    if (!filePath) {
        return "";
    }

    let path =
        String(filePath).trim();

    if (path.startsWith("FIRs/")) {
        path = path.substring(5);
    }

    if (path.startsWith("/")) {
        path = path.substring(1);
    }

    return path;
}

function getPublicFileUrl(filePath) {
    const storagePath =
        normalizeStoragePath(filePath);

    if (!storagePath) {
        return "";
    }

    const {
        data
    } = supabase
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

    return data?.publicUrl || "";
}

window.openUpload = function () {
    const modal =
        document.getElementById(
            "uploadModal"
        );

    if (modal) {
        modal.style.display = "flex";
    }
};

window.closeUpload = function () {
    const modal =
        document.getElementById(
            "uploadModal"
        );

    if (modal) {
        modal.style.display = "none";
    }

    const firNumber =
        document.getElementById(
            "firNumber"
        );

    const firFile =
        document.getElementById(
            "firFile"
        );

    if (firNumber) {
        firNumber.value = "";
    }

    if (firFile) {
        firFile.value = "";
    }
};

window.uploadFIR = async function () {
    const firNumberInput =
        document.getElementById(
            "firNumber"
        );

    const fileInput =
        document.getElementById(
            "firFile"
        );

    if (!firNumberInput || !fileInput) {
        return;
    }

    const firNumber =
        firNumberInput.value.trim();

    const file =
        fileInput.files[0];

    if (!firNumber) {
        alert(
            "Please enter FIR number."
        );
        return;
    }

    if (!file) {
        alert(
            "Please select an FIR document."
        );
        return;
    }

    const allowedTypes = [
        "application/pdf",
        "text/plain"
    ];

    if (!allowedTypes.includes(file.type)) {
        alert(
            "Only PDF and TXT files are allowed."
        );
        return;
    }

    try {
        const uploadButton =
            document.querySelector(
                "#uploadModal .primary-btn"
            );

        if (uploadButton) {
            uploadButton.disabled = true;
            uploadButton.textContent =
                "Uploading...";
        }

        const safeFileName =
            file.name.replace(
                /[^a-zA-Z0-9._-]/g,
                "_"
            );

        const uniqueFileName =
            `${Date.now()}_${safeFileName}`;

        const storagePath =
            uniqueFileName;

        const {
            error: uploadError
        } = await supabase
            .storage
            .from(STORAGE_BUCKET)
            .upload(
                storagePath,
                file,
                {
                    cacheControl: "3600",
                    upsert: false
                }
            );

        if (uploadError) {
            throw uploadError;
        }

        const {
            error: insertError
        } = await supabase
            .from(FIR_TABLE)
            .insert([
                {
                    fir_number: firNumber,
                    file_name: file.name,
                    file_path: storagePath,
                    status: "Filed",
                    priority: "Medium"
                }
            ]);

        if (insertError) {
            throw insertError;
        }

        alert(
            "FIR uploaded successfully."
        );

        closeUpload();

        await loadFIRs();
        await loadTracking();
        await loadAIFIRList();

    } catch (error) {
        console.error(
            "Upload error:",
            error
        );

        alert(
            "FIR upload failed.\n\n" +
            (
                error.message ||
                "Unknown error"
            )
        );

    } finally {
        const uploadButton =
            document.querySelector(
                "#uploadModal .primary-btn"
            );

        if (uploadButton) {
            uploadButton.disabled = false;
            uploadButton.textContent =
                "Upload FIR";
        }
    }
};

async function loadFIRs() {
    const firList =
        document.getElementById(
            "firList"
        );

    if (firList) {
        firList.innerHTML = `
            <p class="empty">
                Loading FIR documents...
            </p>
        `;
    }

    try {
        const {
            data,
            error
        } = await supabase
            .from(FIR_TABLE)
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (error) {
            throw error;
        }

        const firs =
            data || [];

        updateDashboard(firs);
        updateFIRStatusChart(firs);

        if (!firList) {
            return;
        }

        if (firs.length === 0) {
            firList.innerHTML = `
                <p class="empty">
                    No FIR documents found.
                </p>
            `;
            return;
        }

        firList.innerHTML = "";

        firs.forEach(
            fir => {
                renderSingleFIR(
                    fir,
                    firList
                );
            }
        );

    } catch (error) {
        console.error(
            "Load FIR error:",
            error
        );

        if (firList) {
            firList.innerHTML = `
                <p class="empty">
                    Unable to load FIR documents.
                </p>
            `;
        }

        updateDashboard([]);
    }
}

function renderSingleFIR(
    fir,
    container
) {
    const item =
        document.createElement(
            "div"
        );

    item.className =
        "fir-item";

    const status =
        normalizeStatus(
            fir.status
        );

    const priority =
        normalizePriority(
            fir.priority
        );

    const fileUrl =
        getPublicFileUrl(
            fir.file_path
        );

    item.innerHTML = `
        <h3>
            FIR ${escapeHTML(
                fir.fir_number
            )}
        </h3>

        <p>
            <strong>File:</strong>
            ${escapeHTML(
                fir.file_name || "-"
            )}
        </p>

        <p>
            <strong>Status:</strong>

            <select
                onchange="updateStatus('${escapeHTML(
                    fir.id
                )}', this.value)"
            >
                <option
                    value="Filed"
                    ${
                        status === "Filed"
                            ? "selected"
                            : ""
                    }
                >
                    Filed
                </option>

                <option
                    value="Investigation"
                    ${
                        status === "Investigation"
                            ? "selected"
                            : ""
                    }
                >
                    Investigation
                </option>

                <option
                    value="Pending"
                    ${
                        status === "Pending"
                            ? "selected"
                            : ""
                    }
                >
                    Pending
                </option>

                <option
                    value="Closed"
                    ${
                        status === "Closed"
                            ? "selected"
                            : ""
                    }
                >
                    Closed
                </option>
            </select>
        </p>

        <p>
            <strong>Priority:</strong>

            <select
                onchange="updatePriority('${escapeHTML(
                    fir.id
                )}', this.value)"
            >
                <option
                    value="High"
                    ${
                        priority === "High"
                            ? "selected"
                            : ""
                    }
                >
                    High
                </option>

                <option
                    value="Medium"
                    ${
                        priority === "Medium"
                            ? "selected"
                            : ""
                    }
                >
                    Medium
                </option>

                <option
                    value="Low"
                    ${
                        priority === "Low"
                            ? "selected"
                            : ""
                    }
                >
                    Low
                </option>
            </select>
        </p>

        <p>
            <strong>Date:</strong>
            ${formatDate(
                fir.created_at
            )}
        </p>

        <button
            onclick="viewFIR('${escapeHTML(
                fileUrl
            )}')"
        >
            View
        </button>

        <button
            onclick="downloadFIR(
                '${escapeHTML(fileUrl)}',
                '${escapeHTML(
                    fir.file_name || "FIR"
                )}'
            )"
        >
            Download
        </button>

        <button
            onclick="deleteFIR('${escapeHTML(
                fir.id
            )}')"
        >
            Delete
        </button>
    `;

    container.appendChild(item);
}

function updateDashboard(firs) {
    const totalElement =
        document.getElementById(
            "totalFIRs"
        );

    const highElement =
        document.getElementById(
            "highPriority"
        );

    const investigationElement =
        document.getElementById(
            "investigation"
        );

    const closedElement =
        document.getElementById(
            "closed"
        );

    const total =
        Array.isArray(firs)
            ? firs.length
            : 0;

    const high =
        Array.isArray(firs)
            ? firs.filter(
                fir =>
                    normalizePriority(
                        fir.priority
                    ) === "High"
            ).length
            : 0;

    const investigation =
        Array.isArray(firs)
            ? firs.filter(
                fir =>
                    normalizeStatus(
                        fir.status
                    ) === "Investigation"
            ).length
            : 0;

    const closed =
        Array.isArray(firs)
            ? firs.filter(
                fir =>
                    normalizeStatus(
                        fir.status
                    ) === "Closed"
            ).length
            : 0;

    if (totalElement) {
        totalElement.textContent =
            total;
    }

    if (highElement) {
        highElement.textContent =
            high;
    }

    if (investigationElement) {
        investigationElement.textContent =
            investigation;
    }

    if (closedElement) {
        closedElement.textContent =
            closed;
    }
}
/* =====================================================
   FIR STATUS GRAPH
===================================================== */

let firStatusChart = null;

function updateFIRStatusChart(firs) {
    console.log("GRAPH FUNCTION RUNNING");

    const chartCanvas = document.getElementById("firStatusChart");

    if (!chartCanvas) {
        console.log("Graph canvas not found");
        return;
    }

    console.log("Graph function called:", firs);

    let filed = 0;
    let investigation = 0;
    let pending = 0;
    let closed = 0;

    if (Array.isArray(firs)) {

        firs.forEach(fir => {

            const status = normalizeStatus(fir.status);

            if (status === "Filed") {
                filed++;
            }

            if (status === "Investigation") {
                investigation++;
            }

            if (status === "Pending") {
                pending++;
            }

            if (status === "Closed") {
                closed++;
            }

        });

    }

    if (firStatusChart) {
        firStatusChart.destroy();
    }

    firStatusChart = new Chart(chartCanvas, {

        type: "bar",

        data: {

            labels: [
                "Filed",
                "Investigation",
                "Pending",
                "Closed"
            ],

            datasets: [{
    label: "Number of FIRs",
    data: [filed, investigation, pending, closed],
    backgroundColor: [
        "#3b82f6",
        "#f97316",
        "#ef4444",
        "#22c55e"
    ],
    borderColor: [
        "#2563eb",
        "#ea580c",
        "#dc2626",
        "#16a34a"
    ],
    borderWidth: 1,
    borderRadius: 6
}]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {
                    display: false
                }

            },

            scales: {

                y: {

                    beginAtZero: true,

                    ticks: {
                        stepSize: 1
                    },

                    title: {
                        display: true,
                        text: "Number of FIRs"
                    }

                },

                x: {

                    title: {
                        display: true,
                        text: "FIR Status"
                    }

                }

            }

        }

    });

}

window.searchFIR = async function () {
    const input =
        document.getElementById(
            "searchInput"
        );

    const firList =
        document.getElementById(
            "firList"
        );

    if (!input || !firList) {
        return;
    }

    const searchValue =
        input.value
            .trim()
            .toLowerCase();

    try {
        const {
            data,
            error
        } = await supabase
            .from(FIR_TABLE)
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (error) {
            throw error;
        }

        const filtered =
            !searchValue
                ? data
                : data.filter(
                    fir =>
                        String(
                            fir.fir_number || ""
                        )
                            .toLowerCase()
                            .includes(
                                searchValue
                            )
                );

        renderFIRList(
            filtered
        );

    } catch (error) {
        console.error(
            "Search error:",
            error
        );

        firList.innerHTML = `
            <p class="empty">
                Search failed.
            </p>
        `;
    }
};

function renderFIRList(data) {
    const firList =
        document.getElementById(
            "firList"
        );

    if (!firList) {
        return;
    }

    if (
        !data ||
        data.length === 0
    ) {
        firList.innerHTML = `
            <p class="empty">
                No matching FIR found.
            </p>
        `;
        return;
    }

    firList.innerHTML = "";

    data.forEach(
        fir => {
            renderSingleFIR(
                fir,
                firList
            );
        }
    );
}

window.updateStatus =
    async function (
        id,
        status
    ) {
        try {
            const {
                error
            } = await supabase
                .from(FIR_TABLE)
                .update({
                    status:
                        normalizeStatus(
                            status
                        )
                })
                .eq(
                    "id",
                    id
                );

            if (error) {
                throw error;
            }

            await loadFIRs();
            await loadTracking();

        } catch (error) {
            console.error(
                "Status update error:",
                error
            );

            alert(
                "Unable to update status.\n\n" +
                error.message
            );
        }
    };

window.updatePriority =
    async function (
        id,
        priority
    ) {
        try {
            const {
                error
            } = await supabase
                .from(FIR_TABLE)
                .update({
                    priority:
                        normalizePriority(
                            priority
                        )
                })
                .eq(
                    "id",
                    id
                );

            if (error) {
                throw error;
            }

            await loadFIRs();
            await loadTracking();

        } catch (error) {
            console.error(
                "Priority update error:",
                error
            );

            alert(
                "Unable to update priority.\n\n" +
                error.message
            );
        }
    };

window.viewFIR =
    function (url) {
        if (!url) {
            alert(
                "File URL not available."
            );
            return;
        }

        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );
    };

window.downloadFIR =
    async function (
        url,
        fileName
    ) {
        if (!url) {
            alert(
                "File URL not available."
            );
            return;
        }

        try {
            const response =
                await fetch(url);

            if (!response.ok) {
                throw new Error(
                    "Unable to download file."
                );
            }

            const blob =
                await response.blob();

            const blobUrl =
                URL.createObjectURL(
                    blob
                );

            const link =
                document.createElement(
                    "a"
                );

            link.href =
                blobUrl;

            link.download =
                fileName || "FIR";

            document.body.appendChild(
                link
            );

            link.click();

            link.remove();

            URL.revokeObjectURL(
                blobUrl
            );

        } catch (error) {
            console.error(
                "Download error:",
                error
            );

            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );
        }
    };

async function findFIRFileInStorage(
    fir
) {
    if (!fir) {
        return null;
    }

    const originalName =
        String(
            fir.file_name || ""
        ).trim();

    if (!originalName) {
        return null;
    }

    if (fir.file_path) {
        const storagePath =
            normalizeStoragePath(
                fir.file_path
            );

        const url =
            getPublicFileUrl(
                storagePath
            );

        return {
            url: url,
            path: storagePath
        };
    }

    const {
        data,
        error
    } = await supabase
        .storage
        .from(STORAGE_BUCKET)
        .list(
            "",
            {
                limit: 1000,
                offset: 0
            }
        );

    if (error) {
        throw error;
    }

    if (!data || data.length === 0) {
        return null;
    }

    const safeOriginalName =
        originalName.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
        );

    const matchingFile =
        data.find(
            file =>
                file.name === originalName ||
                file.name === safeOriginalName ||
                file.name.endsWith(
                    `_${safeOriginalName}`
                )
        );

    if (!matchingFile) {
        return null;
    }

    const storagePath =
        matchingFile.name;

    const url =
        getPublicFileUrl(
            storagePath
        );

    try {
        await supabase
            .from(FIR_TABLE)
            .update({
                file_path:
                    storagePath
            })
            .eq(
                "id",
                fir.id
            );
    } catch (updateError) {
        console.warn(
            "Could not update old FIR path:",
            updateError
        );
    }

    return {
        url: url,
        path: storagePath
    };
}

window.deleteFIR =
    async function (
        id
    ) {
        const confirmDelete =
            confirm(
                "Are you sure you want to delete this FIR?"
            );

        if (!confirmDelete) {
            return;
        }

        try {
            let fir = null;

            try {
                fir =
                    await getFIRById(
                        id
                    );
            } catch (error) {
                console.warn(
                    "Could not get FIR before deletion:",
                    error
                );
            }

            const {
                error: deleteError
            } = await supabase
                .from(FIR_TABLE)
                .delete()
                .eq(
                    "id",
                    id
                );

            if (deleteError) {
                throw deleteError;
            }

            let storagePath = "";

            if (
                fir &&
                fir.file_path
            ) {
                storagePath =
                    normalizeStoragePath(
                        fir.file_path
                    );
            }

            if (!storagePath && fir) {
                try {
                    const storageFile =
                        await findFIRFileInStorage(
                            fir
                        );

                    if (storageFile) {
                        storagePath =
                            storageFile.path;
                    }
                } catch (
                    storageError
                ) {
                    console.warn(
                        "Storage search warning:",
                        storageError
                    );
                }
            }

            if (storagePath) {
                try {
                    const {
                        error:
                            storageDeleteError
                    } = await supabase
                        .storage
                        .from(
                            STORAGE_BUCKET
                        )
                        .remove([
                            storagePath
                        ]);

                    if (
                        storageDeleteError
                    ) {
                        console.warn(
                            "Storage deletion warning:",
                            storageDeleteError
                        );
                    }

                } catch (
                    storageError
                ) {
                    console.warn(
                        "Storage deletion warning:",
                        storageError
                    );
                }
            }

            alert(
                "FIR deleted successfully."
            );

            await loadFIRs();
            await loadTracking();
            await loadAIFIRList();

        } catch (error) {
            console.error(
                "Delete error:",
                error
            );

            alert(
                "Unable to delete FIR.\n\n" +
                error.message
            );
        }
    };

window.loadTracking =
    async function () {
        const trackingList =
            document.getElementById(
                "trackingList"
            );

        if (!trackingList) {
            return;
        }

        trackingList.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="tracking-empty"
                >
                    Loading FIR tracking records...
                </td>
            </tr>
        `;

        try {
            const {
                data,
                error
            } = await supabase
                .from(FIR_TABLE)
                .select(
                    "id,fir_number,file_name,file_path,status,priority,created_at"
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

            if (error) {
                throw error;
            }

            updateTrackingCounts(
                data || []
            );

            renderTrackingRecords(
                data || []
            );

        } catch (error) {
            console.error(
                "Tracking load error:",
                error
            );

            trackingList.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="tracking-empty"
                    >
                        Unable to load tracking records.
                    </td>
                </tr>
            `;
        }
    };

function updateTrackingCounts(
    firs
) {
    const filed =
        firs.filter(
            fir =>
                normalizeStatus(
                    fir.status
                ) === "Filed"
        ).length;

    const investigation =
        firs.filter(
            fir =>
                normalizeStatus(
                    fir.status
                ) === "Investigation"
        ).length;

    const pending =
        firs.filter(
            fir =>
                normalizeStatus(
                    fir.status
                ) === "Pending"
        ).length;

    const closed =
        firs.filter(
            fir =>
                normalizeStatus(
                    fir.status
                ) === "Closed"
        ).length;

    const filedElement =
        document.getElementById(
            "trackingFiledCount"
        );

    const investigationElement =
        document.getElementById(
            "trackingInvestigationCount"
        );

    const pendingElement =
        document.getElementById(
            "trackingPendingCount"
        );

    const closedElement =
        document.getElementById(
            "trackingClosedCount"
        );

    if (filedElement) {
        filedElement.textContent =
            `${filed} FIR${
                filed === 1
                    ? ""
                    : "s"
            }`;
    }

    if (investigationElement) {
        investigationElement.textContent =
            `${investigation} FIR${
                investigation === 1
                    ? ""
                    : "s"
            }`;
    }

    if (pendingElement) {
        pendingElement.textContent =
            `${pending} FIR${
                pending === 1
                    ? ""
                    : "s"
            }`;
    }

    if (closedElement) {
        closedElement.textContent =
            `${closed} FIR${
                closed === 1
                    ? ""
                    : "s"
            }`;
    }
}

function renderTrackingRecords(
    firs
) {
    const trackingList =
        document.getElementById(
            "trackingList"
        );

    if (!trackingList) {
        return;
    }

    trackingList.innerHTML = "";

    if (
        !firs ||
        firs.length === 0
    ) {
        trackingList.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="tracking-empty"
                >
                    No FIR tracking records found.
                </td>
            </tr>
        `;

        return;
    }

    firs.forEach(
        fir => {
            const row =
                document.createElement(
                    "tr"
                );

            const status =
                normalizeStatus(
                    fir.status
                );

            const priority =
                normalizePriority(
                    fir.priority
                );

            row.innerHTML = `
                <td>
                    FIR ${escapeHTML(
                        fir.fir_number || "-"
                    )}
                </td>

                <td
                    title="${escapeHTML(
                        fir.file_name || "-"
                    )}"
                >
                    ${escapeHTML(
                        fir.file_name || "-"
                    )}
                </td>

                <td>
                    <span
                        class="tracking-status ${getStatusClass(
                            status
                        )}"
                    >
                        ${escapeHTML(
                            status
                        )}
                    </span>
                </td>

                <td>
                    <span
                        class="tracking-priority ${getPriorityClass(
                            priority
                        )}"
                    >
                        ${escapeHTML(
                            priority
                        )}
                    </span>
                </td>

                <td>
                    ${escapeHTML(
                        formatDate(
                            fir.created_at
                        )
                    )}
                </td>
            `;

            trackingList.appendChild(
                row
            );
        }
    );
}

window.openAIAnalysis =
    async function () {
        const modal =
            document.getElementById(
                "aiAnalysisModal"
            );

        if (!modal) {
            return;
        }

        modal.style.display =
            "flex";

        await loadAIFIRList();
    };

window.closeAIAnalysis =
    function () {
        const modal =
            document.getElementById(
                "aiAnalysisModal"
            );

        if (modal) {
            modal.style.display =
                "none";
        }
    };

window.closeAIResult =
    function () {
        const modal =
            document.getElementById(
                "aiResultModal"
            );

        if (modal) {
            modal.style.display =
                "none";
        }
    };

window.selectAIFeature =
    function (feature) {
        selectedAIFeature =
            feature;

        const featureNames = {
            summary:
                "Case Summary",

            segmentation:
                "FIR Segmentation",

            priority:
                "Priority Analysis",

            evidence:
                "Evidence Cross-Reference"
        };

        const selectedElement =
            document.getElementById(
                "selectedAIFeature"
            );

        if (selectedElement) {
            selectedElement.textContent =
                featureNames[
                    feature
                ] ||
                "Select AI Feature";
        }

        document
            .querySelectorAll(
                ".ai-feature-btn"
            )
            .forEach(
                button => {
                    button.classList.remove(
                        "active"
                    );

                    if (
                        button.dataset
                            .feature ===
                        feature
                    ) {
                        button.classList.add(
                            "active"
                        );
                    }
                }
            );
    };

window.selectAIFIR =
    function (firId) {
        selectedAIFIR =
            firId;
    };

async function loadAIFIRList() {
    const select =
        document.getElementById(
            "aiFIRSelect"
        );

    if (!select) {
        return;
    }

    try {
        const {
            data,
            error
        } = await supabase
            .from(FIR_TABLE)
            .select(
                "id,fir_number,file_name,file_path"
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (error) {
            throw error;
        }

        select.innerHTML = `
            <option value="">
                -- Select FIR --
            </option>
        `;

        (
            data || []
        ).forEach(
            fir => {
                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    fir.id;

                option.textContent =
                    `FIR ${fir.fir_number} - ${fir.file_name}`;

                select.appendChild(
                    option
                );
            }
        );

    } catch (error) {
        console.error(
            "AI FIR list error:",
            error
        );
    }
}

async function getFIRById(
    id
) {
    const {
        data,
        error
    } = await supabase
        .from(FIR_TABLE)
        .select("*")
        .eq(
            "id",
            id
        )
        .single();

    if (error) {
        throw error;
    }

    return data;
}

async function extractFIRText(
    fir
) {
    if (!fir) {
        throw new Error(
            "FIR document not found."
        );
    }

    let storagePath =
        String(
            fir.file_path || ""
        ).trim();

    if (!storagePath) {
        const storageFile =
            await findFIRFileInStorage(
                fir
            );

        if (
            storageFile &&
            storageFile.path
        ) {
            storagePath =
                storageFile.path;
        }
    }

    if (!storagePath) {
        throw new Error(
            "FIR file path is not available in the firs table."
        );
    }

    storagePath =
        normalizeStoragePath(
            storagePath
        );

    console.log(
        "Reading FIR file from Storage:",
        storagePath
    );

    const {
        data: fileData,
        error: downloadError
    } = await supabase
        .storage
        .from(STORAGE_BUCKET)
        .download(
            storagePath
        );

    if (downloadError) {
        console.error(
            "Supabase Storage download error:",
            downloadError
        );

        throw new Error(
            "Unable to read FIR document from Supabase Storage.\n\n" +
            downloadError.message
        );
    }

    if (!fileData) {
        throw new Error(
            "Supabase Storage returned an empty file."
        );
    }

    const fileName =
        String(
            fir.file_name ||
            storagePath
        ).toLowerCase();

    if (
        fileName.endsWith(".txt") ||
        fileData.type === "text/plain"
    ) {
        return await fileData.text();
    }

    if (
        fileName.endsWith(".pdf") ||
        fileData.type === "application/pdf"
    ) {
        try {
            const pdfjsLib =
                await import(
                    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs"
                );

            pdfjsLib
                .GlobalWorkerOptions
                .workerSrc =
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

            const arrayBuffer =
                await fileData.arrayBuffer();

            const pdf =
                await pdfjsLib
                    .getDocument({
                        data:
                            arrayBuffer
                    })
                    .promise;

            let fullText = "";

            for (
                let pageNumber = 1;
                pageNumber <=
                pdf.numPages;
                pageNumber++
            ) {
                const page =
                    await pdf.getPage(
                        pageNumber
                    );

                const textContent =
                    await page.getTextContent();

                const pageText =
                    textContent.items
                        .map(
                            item =>
                                item.str
                        )
                        .join(" ");

                fullText +=
                    `\n\nPage ${pageNumber}\n${pageText}`;
            }

            const extractedText =
                fullText.trim();

            if (!extractedText) {
                throw new Error(
                    "The PDF was opened successfully, but no readable text was found."
                );
            }

            return extractedText;

        } catch (error) {
            console.error(
                "PDF extraction error:",
                error
            );

            throw new Error(
                "Unable to extract text from this PDF.\n\n" +
                error.message
            );
        }
    }

    throw new Error(
        "Unsupported FIR document format."
    );
}

window.startAIAnalysis =
    async function () {
        if (
            !selectedAIFeature
        ) {
            alert(
                "Please select an AI feature."
            );
            return;
        }

        const select =
            document.getElementById(
                "aiFIRSelect"
            );

        const firId =
            select
                ? select.value
                : selectedAIFIR;

        if (!firId) {
            alert(
                "Please select an FIR document."
            );
            return;
        }

        selectedAIFIR =
            firId;

        const resultModal =
            document.getElementById(
                "aiResultModal"
            );

        const resultTitle =
            document.getElementById(
                "aiResultTitle"
            );

        const resultContent =
            document.getElementById(
                "aiResultContent"
            );

        if (
            !resultModal ||
            !resultContent
        ) {
            return;
        }

        resultModal.style.display =
            "flex";

        resultContent.innerHTML = `
            <div class="ai-loading">
                AI is analyzing the FIR...
            </div>
        `;

        const featureNames = {
            summary:
                "Case Summary",

            segmentation:
                "FIR Segmentation",

            priority:
                "Priority Analysis",

            evidence:
                "Evidence Cross-Reference"
        };

        if (resultTitle) {
            resultTitle.textContent =
                featureNames[
                    selectedAIFeature
                ] ||
                "AI Result";
        }

        try {
            const fir =
                await getFIRById(
                    firId
                );

            const text =
                await extractFIRText(
                    fir
                );

            if (
                !text ||
                text.trim().length === 0
            ) {
                throw new Error(
                    "No readable text found in the FIR."
                );
            }

            console.log(
                "FIR text extracted successfully."
            );

            const prompt =
                createAIPrompt(
                    selectedAIFeature,
                    text,
                    fir
                );

            const result =
                await callLMStudio(
                    prompt
                );

            resultContent.innerHTML =
                formatAIResult(
                    result
                );

            if (
                selectedAIFeature ===
                "priority"
            ) {
                const detectedPriority =
                    detectPriority(
                        result
                    );

                if (
                    detectedPriority
                ) {
                    const {
                        error:
                            priorityError
                    } = await supabase
                        .from(FIR_TABLE)
                        .update({
                            priority:
                                detectedPriority
                        })
                        .eq(
                            "id",
                            fir.id
                        );

                    if (
                        priorityError
                    ) {
                        console.error(
                            "Priority database update error:",
                            priorityError
                        );
                    } else {
                        await loadFIRs();
                        await loadTracking();
                    }
                }
            }

        } catch (error) {
            console.error(
                "AI analysis error:",
                error
            );

            resultContent.innerHTML = `
                <h3>
                    AI Analysis Error
                </h3>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

                <p
                    style="margin-top:10px;"
                >
                    Check that the FIR file exists,
                    Supabase Storage is accessible,
                    and LM Studio is running.
                </p>
            `;
        }
    };

function createAIPrompt(
    feature,
    text,
    fir
) {
    const baseInfo = `
FIR Number: ${
        fir.fir_number ||
        "Unknown"
    }

File Name: ${
        fir.file_name ||
        "Unknown"
    }

FIR Document:

${text}
`;

    if (
        feature ===
        "summary"
    ) {
        return `
You are an AI assistant for a FIR document management system.

Generate a clear and concise case summary from the FIR.

Include:

1. FIR Number
2. Type of Case
3. Main Incident
4. Date and Location if available
5. Complainant if available
6. Accused if available
7. Important Facts
8. Current Status if available

Do not invent information.

${baseInfo}
`;
    }

    if (
        feature ===
        "segmentation"
    ) {
        return `
You are an AI assistant for a FIR document management system.

Organize the FIR into meaningful sections.

Use headings such as:

1. FIR Details
2. Incident Details
3. Persons Involved
4. Accused Information
5. Evidence / Items
6. Witness Information
7. Legal Sections
8. Important Observations

Only use information present in the FIR.

${baseInfo}
`;
    }

    if (
        feature ===
        "priority"
    ) {
        return `
You are an AI assistant for a FIR document management system.

Analyze the FIR and determine its priority.

Choose exactly one:

HIGH
MEDIUM
LOW

Consider factors such as:

- seriousness of the incident
- threat to life or safety
- violence
- major financial loss
- urgency
- vulnerable persons
- ongoing danger
- other clearly documented circumstances

Do not invent facts.

Start your answer with exactly one of:

Priority: HIGH

or

Priority: MEDIUM

or

Priority: LOW

Then explain the reasons based only on the FIR.

${baseInfo}
`;
    }

    if (
        feature ===
        "evidence"
    ) {
        return `
You are an AI assistant for a FIR document management system.

Analyze the FIR for evidence-related information.

Identify:

1. Evidence mentioned
2. Persons connected with the evidence
3. Important locations
4. Dates and times
5. Objects or documents
6. Relationships between evidence and persons
7. Important cross-reference points

Do not invent evidence.

${baseInfo}
`;
    }

    return `
Analyze the following FIR document and provide useful information.

${baseInfo}
`;
}

async function getLMStudioModel() {
    try {
        const response =
            await fetch(
                LM_STUDIO_MODELS_URL
            );

        if (!response.ok) {
            throw new Error(
                `LM Studio model server returned ${response.status}.`
            );
        }

        const data =
            await response.json();

        const models =
            data?.data || [];

        if (
            models.length === 0
        ) {
            throw new Error(
                "No model is currently loaded in LM Studio."
            );
        }

        const exactModel =
            models.find(
                model =>
                    model.id ===
                    LM_STUDIO_MODEL
            );

        if (
            exactModel
        ) {
            return exactModel.id;
        }

        console.warn(
            "Configured LM Studio model not found. Using first available model:",
            models[0].id
        );

        return models[0].id;

    } catch (error) {
        throw new Error(
            "Cannot connect to LM Studio. Make sure LM Studio is running and a model is loaded.\n\n" +
            error.message
        );
    }
}

async function callLMStudio(
    prompt
) {
    const model =
        await getLMStudioModel();

    console.log(
        "Using LM Studio model:",
        model
    );

    let response;

    try {
        response =
            await fetch(
                LM_STUDIO_URL,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            model:
                                model,

                            messages: [
                                {
                                    role:
                                        "system",

                                    content:
                                        "You are a helpful FIR document analysis assistant. Use only information contained in the provided FIR."
                                },

                                {
                                    role:
                                        "user",

                                    content:
                                        prompt
                                }
                            ],

                            temperature:
                                0.2,

                            max_tokens:
                                2500
                        })
                }
            );

    } catch (error) {
        throw new Error(
            "Could not connect to LM Studio at http://localhost:1234.\n\n" +
            "Make sure LM Studio is running and the local server is started.\n\n" +
            error.message
        );
    }

    if (!response.ok) {
        const errorText =
            await response.text();

        throw new Error(
            `LM Studio error: ${response.status} ${errorText}`
        );
    }

    const data =
        await response.json();

    const result =
        data
            ?.choices?.[0]
            ?.message
            ?.content;

    if (!result) {
        throw new Error(
            "LM Studio returned an empty response."
        );
    }

    return result;
}

function formatAIResult(text) {
    if (!text) {
        return "<p>No AI result available.</p>";
    }

    const lines =
        String(text)
            .replace(/\r/g, "")
            .split("\n");

    let html = "";
    let inList = false;
    let listType = "";

    function closeList() {
        if (inList) {
            html += `</${listType}>`;
            inList = false;
            listType = "";
        }
    }

    lines.forEach(
        line => {
            line =
                line.trim();

            if (!line) {
                closeList();
                return;
            }

            if (
                /^#{1,3}\s+/.test(
                    line
                )
            ) {
                closeList();

                const heading =
                    line
                        .replace(
                            /^#{1,3}\s+/,
                            ""
                        )
                        .replace(
                            /\*\*/g,
                            ""
                        );

                html += `
                    <div class="ai-section-heading">
                        ${escapeHTML(
                            heading
                        )}
                    </div>
                `;

                return;
            }

            if (
                line.endsWith(":") &&
                !/^\d+\.\s/.test(
                    line
                ) &&
                !/^[-•*]\s/.test(
                    line
                )
            ) {
                closeList();

                const heading =
                    line
                        .replace(
                            /\*\*/g,
                            ""
                        )
                        .replace(
                            /:$/,
                            ""
                        );

                html += `
                    <div class="ai-section-heading">
                        ${escapeHTML(
                            heading
                        )}
                    </div>
                `;

                return;
            }

            if (
                /^[-•*]\s+/.test(
                    line
                )
            ) {
                if (
                    !inList ||
                    listType !== "ul"
                ) {
                    closeList();

                    html += "<ul>";

                    inList = true;
                    listType = "ul";
                }

                let content =
                    line.replace(
                        /^[-•*]\s+/,
                        ""
                    );

                content =
                    formatAIInlineText(
                        content
                    );

                html +=
                    `<li>${content}</li>`;

                return;
            }

            if (
                /^\d+\.\s+/.test(
                    line
                )
            ) {
                if (
                    !inList ||
                    listType !== "ol"
                ) {
                    closeList();

                    html += "<ol>";

                    inList = true;
                    listType = "ol";
                }

                let content =
                    line.replace(
                        /^\d+\.\s+/,
                        ""
                    );

                content =
                    formatAIInlineText(
                        content
                    );

                html +=
                    `<li>${content}</li>`;

                return;
            }

            closeList();

            html += `
                <p>
                    ${formatAIInlineText(
                        line
                    )}
                </p>
            `;
        }
    );

    closeList();

    return html;
}

function formatAIInlineText(
    text
) {
    let safeText =
        escapeHTML(text);

    safeText =
        safeText.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );

    safeText =
        safeText.replace(
            /__(.*?)__/g,
            "<strong>$1</strong>"
        );

    safeText =
        safeText.replace(
            /^([^:]{1,60}):/,
            "<strong>$1:</strong>"
        );

    return safeText;
}

function detectPriority(
    result
) {
    const text =
        String(
            result || ""
        ).toUpperCase();

    const priorityMatch =
        text.match(
            /PRIORITY\s*:\s*(HIGH|MEDIUM|LOW)/
        );

    if (
        priorityMatch
    ) {
        const value =
            priorityMatch[1];

        return (
            value.charAt(0) +
            value
                .slice(1)
                .toLowerCase()
        );
    }

    const firstPart =
        text.substring(
            0,
            150
        );

    if (
        /\bHIGH\b/.test(
            firstPart
        )
    ) {
        return "High";
    }

    if (
        /\bLOW\b/.test(
            firstPart
        )
    ) {
        return "Low";
    }

    if (
        /\bMEDIUM\b/.test(
            firstPart
        )
    ) {
        return "Medium";
    }

    return null;
}

window.addEventListener(
    "click",
    function (event) {
        const uploadModal =
            document.getElementById(
                "uploadModal"
            );

        const aiModal =
            document.getElementById(
                "aiAnalysisModal"
            );

        const resultModal =
            document.getElementById(
                "aiResultModal"
            );

        if (
            event.target ===
            uploadModal
        ) {
            closeUpload();
        }

        if (
            event.target ===
            aiModal
        ) {
            closeAIAnalysis();
        }

        if (
            event.target ===
            resultModal
        ) {
            closeAIResult();
        }
    }
);

if (
    window.location.pathname.endsWith(
        "ai-analysis.html"
    )
) {
    const params =
        new URLSearchParams(
            window.location.search
        );

    if (
        params.get("openAI") ===
        "true"
    ) {
        setTimeout(
            () => {
                openAIAnalysis();
            },
            100
        );
    }
}
window.logoutUser = async function () {
    const { error } = await supabase.auth.signOut();

    if (error) {
        alert("Logout failed. Please try again.");
        console.error("Logout error:", error);
        return;
    }

    window.location.href = "login.html";
};
