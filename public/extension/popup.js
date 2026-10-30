/**
 * Booking KOL CRM - Popup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const connectionDot = document.getElementById('connectionDot');
    const toggleSettingsBtn = document.getElementById('toggleSettingsBtn');
    const settingsCard = document.getElementById('settingsCard');
    const settingsClose = document.getElementById('settingsClose');
    const apiUrlInput = document.getElementById('apiUrlInput');
    const apiTokenInput = document.getElementById('apiTokenInput');
    const btnTestConnection = document.getElementById('btnTestConnection');
    const connectionStatusMsg = document.getElementById('connectionStatusMsg');

    const emptyState = document.getElementById('emptyState');
    const creatorFormArea = document.getElementById('creatorFormArea');

    const creatorAvatar = document.getElementById('creatorAvatar');
    const creatorNameHeader = document.getElementById('creatorNameHeader');
    const creatorHandleHeader = document.getElementById('creatorHandleHeader');
    const platformBadge = document.getElementById('platformBadge');
    const followersBadge = document.getElementById('followersBadge');

    const crmStatusBox = document.getElementById('crmStatusBox');
    const crmStatusText = document.getElementById('crmStatusText');
    const crmViewLink = document.getElementById('crmViewLink');

    const inputName = document.getElementById('inputName');
    const inputPhone = document.getElementById('inputPhone');
    const inputEmail = document.getElementById('inputEmail');
    const selectNiche = document.getElementById('selectNiche');
    const inputRatePrice = document.getElementById('inputRatePrice');
    const inputNotes = document.getElementById('inputNotes');
    const btnSaveCreator = document.getElementById('btnSaveCreator');
    const saveBtnText = document.getElementById('saveBtnText');
    const resultBanner = document.getElementById('resultBanner');

    let currentProfile = null;
    let config = {
        apiUrl: 'http://booking_kol.test/api/v1/extension',
        apiToken: ''
    };

    // 1. Tải cấu hình đã lưu
    chrome.storage.local.get(['apiUrl', 'apiToken'], (res) => {
        if (res.apiUrl) config.apiUrl = res.apiUrl;
        if (res.apiToken) config.apiToken = res.apiToken;

        apiUrlInput.value = config.apiUrl;
        apiTokenInput.value = config.apiToken;

        if (!config.apiToken) {
            settingsCard.classList.remove('hidden');
            connectionDot.className = 'status-dot';
            connectionStatusMsg.innerText = 'Vui lòng dán mã API Token để kết nối CRM.';
        } else {
            verifyConnection(false);
        }
    });

    // 2. Xử lý Toggle Settings
    toggleSettingsBtn.addEventListener('click', () => {
        settingsCard.classList.toggle('hidden');
    });
    settingsClose.addEventListener('click', () => {
        settingsCard.classList.add('hidden');
    });

    // 3. Kiểm tra kết nối API
    async function verifyConnection(showFeedback = true) {
        const url = apiUrlInput.value.trim().replace(/\/+$/, '');
        const token = apiTokenInput.value.trim();

        if (!url || !token) {
            connectionDot.className = 'status-dot error';
            if (showFeedback) connectionStatusMsg.innerText = 'Vui lòng nhập đầy đủ Địa chỉ API và Token.';
            return false;
        }

        if (showFeedback) connectionStatusMsg.innerText = 'Đang kiểm tra kết nối...';

        try {
            const resp = await fetch(`${url}/ping`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (resp.ok) {
                const data = await resp.json();
                connectionDot.className = 'status-dot connected';
                connectionStatusMsg.innerText = `Đã kết nối: ${data.user?.name || 'Hợp lệ'}`;
                config.apiUrl = url;
                config.apiToken = token;
                chrome.storage.local.set({ apiUrl: url, apiToken: token });
                return true;
            } else {
                connectionDot.className = 'status-dot error';
                connectionStatusMsg.innerText = 'Lỗi xác thực: Sai mã API Token.';
                return false;
            }
        } catch (err) {
            connectionDot.className = 'status-dot error';
            connectionStatusMsg.innerText = `Không kết nối được tới Web Tool: ${err.message}`;
            return false;
        }
    }

    btnTestConnection.addEventListener('click', () => verifyConnection(true));

    // 4. Trích xuất thông tin từ tab hiện tại
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'extract_profile' }, (profile) => {
                if (chrome.runtime.lastError || !profile) {
                    // Thử inject script nếu trang chưa có content script
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    }, () => {
                        chrome.tabs.sendMessage(tab.id, { action: 'extract_profile' }, (p2) => {
                            if (p2) handleProfileDetected(p2);
                        });
                    });
                    return;
                }
                handleProfileDetected(profile);
            });
        }
    } catch (e) {
        console.error(e);
    }

    function handleProfileDetected(profile) {
        currentProfile = profile;
        emptyState.style.display = 'none';
        creatorFormArea.style.display = 'block';

        // Render Hero
        creatorNameHeader.innerText = profile.name || profile.handle;
        creatorHandleHeader.innerText = `@${profile.handle}`;
        platformBadge.innerText = (profile.platform || 'TIKTOK').toUpperCase();
        followersBadge.innerText = `${profile.followers_raw || profile.followers_count.toLocaleString()} followers`;

        if (profile.avatar_url) {
            creatorAvatar.src = profile.avatar_url;
        } else {
            creatorAvatar.src = 'icons/icon48.png';
        }

        // Điền form
        inputName.value = profile.name || profile.handle;
        inputPhone.value = profile.phone || '';
        inputEmail.value = profile.email || '';
        inputNotes.value = profile.bio || '';

        // Kiểm tra xem đã có trong CRM chưa
        checkExistingInCrm(profile.platform, profile.handle);
    }

    // 5. Kiểm tra hồ sơ trong CRM
    async function checkExistingInCrm(platform, handle) {
        if (!config.apiToken) return;

        try {
            const resp = await fetch(`${config.apiUrl}/check?platform=${encodeURIComponent(platform)}&handle=${encodeURIComponent(handle)}`, {
                headers: {
                    'Authorization': `Bearer ${config.apiToken}`,
                    'Accept': 'application/json'
                }
            });

            if (resp.ok) {
                const data = await resp.json();
                if (data.exists && data.creator) {
                    crmStatusBox.className = 'crm-status-box exists';
                    crmStatusText.innerText = `⚠️ Đã có trong CRM: #${data.creator.id} (${data.creator.name})`;
                    crmViewLink.style.display = 'inline';
                    crmViewLink.href = data.creator.url;
                    crmViewLink.onclick = (e) => {
                        e.preventDefault();
                        chrome.tabs.create({ url: data.creator.url });
                    };
                    saveBtnText.innerText = 'Cập nhật hồ sơ vào CRM';
                } else {
                    crmStatusBox.className = 'crm-status-box new';
                    crmStatusText.innerText = '✨ Hồ sơ mới chưa có trong CRM';
                    crmViewLink.style.display = 'none';
                    saveBtnText.innerText = 'Lưu vào Booking CRM';
                }
            }
        } catch (e) {
            console.warn('Lỗi khi kiểm tra CRM:', e);
        }
    }

    // 6. Xử lý lưu Creator
    btnSaveCreator.addEventListener('click', async () => {
        if (!currentProfile) return;

        const isConnected = await verifyConnection(false);
        if (!isConnected) {
            settingsCard.classList.remove('hidden');
            resultBanner.className = 'result-banner error';
            resultBanner.style.display = 'block';
            resultBanner.innerText = 'Vui lòng kiểm tra lại cấu hình API và Token.';
            return;
        }

        btnSaveCreator.disabled = true;
        saveBtnText.innerHTML = '<span class="spinner"></span> Đang lưu vào CRM...';
        resultBanner.style.display = 'none';

        const payload = {
            name: inputName.value.trim() || currentProfile.name || currentProfile.handle,
            platform: currentProfile.platform,
            handle: currentProfile.handle,
            url: currentProfile.url,
            followers_count: currentProfile.followers_count || 0,
            avatar_url: currentProfile.avatar_url,
            phone: inputPhone.value.trim() || null,
            email: inputEmail.value.trim() || null,
            niche: selectNiche.value,
            rate_price: inputRatePrice.value ? parseFloat(inputRatePrice.value) : null,
            notes: inputNotes.value.trim() || null,
            bio: currentProfile.bio || null
        };

        try {
            const resp = await fetch(`${config.apiUrl}/collect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiToken}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await resp.json();

            if (resp.ok && data.status === 'success') {
                resultBanner.className = 'result-banner success';
                resultBanner.style.display = 'block';
                resultBanner.innerHTML = `
                    <div style="font-weight: 700; margin-bottom: 4px;">🎉 ${data.message}</div>
                    <a href="${data.crm_url}" target="_blank" style="color: #4f46e5; font-weight: 600; text-decoration: underline;">
                        Bấm vào đây để mở xem chi tiết trên Web Tool →
                    </a>
                `;

                // Cập nhật trạng thái
                crmStatusBox.className = 'crm-status-box exists';
                crmStatusText.innerText = `Đã lưu hồ sơ #${data.creator.id}`;
                crmViewLink.style.display = 'inline';
                crmViewLink.href = data.crm_url;
                crmViewLink.onclick = (e) => {
                    e.preventDefault();
                    chrome.tabs.create({ url: data.crm_url });
                };
            } else {
                resultBanner.className = 'result-banner error';
                resultBanner.style.display = 'block';
                resultBanner.innerText = data.message || 'Có lỗi xảy ra khi lưu.';
            }
        } catch (err) {
            resultBanner.className = 'result-banner error';
            resultBanner.style.display = 'block';
            resultBanner.innerText = `Lỗi mạng: ${err.message}`;
        } finally {
            btnSaveCreator.disabled = false;
            saveBtnText.innerText = 'Lưu lại lần nữa';
        }
    });
});
