/**
 * Booking KOL CRM - Content Script
 * Trích xuất an toàn thông tin công khai từ trang cá nhân của Creator
 */

function parseFollowerCount(text) {
    if (!text) return 0;
    const clean = text.toString().trim().replace(/,/g, '').toUpperCase();

    if (clean.includes('M') || clean.includes('TR')) {
        const num = parseFloat(clean.replace(/[M|TR]/g, ''));
        return Math.round(num * 1000000);
    }
    if (clean.includes('K') || clean.includes('N')) {
        const num = parseFloat(clean.replace(/[K|N]/g, ''));
        return Math.round(num * 1000);
    }
    const num = parseInt(clean.replace(/[^\d]/g, ''), 10);
    return isNaN(num) ? 0 : num;
}

function extractPhoneFromText(text) {
    if (!text) return null;
    // Tìm mẫu số điện thoại di động Việt Nam (03, 05, 07, 08, 09, +84, 84)
    const match = text.match(/(?:(?:\+84|84|0)[3|5|7|8|9][0-9]{8})/);
    return match ? match[0] : null;
}

function extractEmailFromText(text) {
    if (!text) return null;
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0] : null;
}

function extractTikTokProfile() {
    const url = window.location.href;
    const pathMatch = window.location.pathname.match(/@([a-zA-Z0-9_.-]+)/);
    const handle = pathMatch ? pathMatch[1] : '';

    if (!handle) return null;

    const titleEl = document.querySelector('[data-e2e="user-title"], h1');
    const subtitleEl = document.querySelector('[data-e2e="user-subtitle"], h2');
    const name = titleEl ? titleEl.innerText.trim() : (subtitleEl ? subtitleEl.innerText.trim() : handle);

    const followersEl = document.querySelector('[data-e2e="followers-count"]');
    const followersRaw = followersEl ? followersEl.innerText.trim() : '0';
    const followersCount = parseFollowerCount(followersRaw);

    const bioEl = document.querySelector('[data-e2e="user-bio"], [data-e2e="user-subtitle"] ~ div');
    const bio = bioEl ? bioEl.innerText.trim() : '';

    const avatarEl = document.querySelector('[data-e2e="user-avatar"] img, span[shape="circle"] img, img[class*="Avatar"]');
    const avatarUrl = avatarEl ? avatarEl.src : null;

    const fullBioText = bio;
    const phone = extractPhoneFromText(fullBioText);
    const email = extractEmailFromText(fullBioText);

    return {
        platform: 'tiktok',
        name: name || handle,
        handle: handle.replace(/^@/, ''),
        url: `https://www.tiktok.com/@${handle.replace(/^@/, '')}`,
        followers_count: followersCount,
        followers_raw: followersRaw,
        bio: bio,
        phone: phone,
        email: email,
        avatar_url: avatarUrl,
    };
}

function extractFacebookProfile() {
    const url = window.location.href;
    let handle = window.location.pathname.replace(/^\//, '').split('/')[0];
    if (handle.includes('profile.php')) {
        const params = new URLSearchParams(window.location.search);
        handle = params.get('id') || 'facebook_user';
    }

    const h1El = document.querySelector('h1');
    const name = h1El ? h1El.innerText.trim() : handle;

    let followersCount = 0;
    let followersRaw = '0';
    const bodyText = document.body.innerText;
    const followerMatch = bodyText.match(/([0-9.,KkMmNnTr]+)\s*(?:người theo dõi|followers)/i);
    if (followerMatch) {
        followersRaw = followerMatch[1];
        followersCount = parseFollowerCount(followersRaw);
    }

    const bioEl = document.querySelector('div[dir="auto"]');
    const bio = bioEl ? bioEl.innerText.trim() : '';

    const phone = extractPhoneFromText(bodyText.slice(0, 5000));
    const email = extractEmailFromText(bodyText.slice(0, 5000));

    return {
        platform: 'facebook',
        name: name,
        handle: handle,
        url: url.split('?')[0],
        followers_count: followersCount,
        followers_raw: followersRaw,
        bio: bio,
        phone: phone,
        email: email,
        avatar_url: null,
    };
}

function extractInstagramProfile() {
    const handle = window.location.pathname.replace(/^\//, '').split('/')[0];
    if (!handle || ['explore', 'direct', 'reels', 'stories'].includes(handle)) {
        return null;
    }

    const nameEl = document.querySelector('header h2, header h1, header section span');
    const name = nameEl ? nameEl.innerText.trim() : handle;

    let followersCount = 0;
    let followersRaw = '0';
    const metaFollowers = document.querySelector('meta[name="description"]')?.content;
    if (metaFollowers) {
        const match = metaFollowers.match(/([0-9.,KkMm]+)\s*Followers/i);
        if (match) {
            followersRaw = match[1];
            followersCount = parseFollowerCount(followersRaw);
        }
    }

    const bio = document.querySelector('header section')?.innerText || '';
    const phone = extractPhoneFromText(bio);
    const email = extractEmailFromText(bio);
    const avatarEl = document.querySelector('header img');

    return {
        platform: 'instagram',
        name: name || handle,
        handle: handle,
        url: `https://www.instagram.com/${handle}/`,
        followers_count: followersCount,
        followers_raw: followersRaw,
        bio: bio.slice(0, 500),
        phone: phone,
        email: email,
        avatar_url: avatarEl ? avatarEl.src : null,
    };
}

function extractCurrentProfile() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('tiktok.com')) {
        return extractTikTokProfile();
    }
    if (host.includes('facebook.com')) {
        return extractFacebookProfile();
    }
    if (host.includes('instagram.com')) {
        return extractInstagramProfile();
    }
    return null;
}

// Lắng nghe yêu cầu lấy dữ liệu từ Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extract_profile') {
        const data = extractCurrentProfile();
        sendResponse(data);
    }
    return true;
});
