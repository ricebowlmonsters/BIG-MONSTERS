/**
 * Backend khusus sinkronisasi ulasan Google Business Profile.
 * Tempel seluruh file ini ke project Google Apps Script baru.
 * Jangan menaruh password atau token Google di kode.
 */

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'status';
    if (action === 'getGoogleReviews') return getGoogleReviews_();
    return json_({
      status: 'success',
      message: 'Backend ulasan Google aktif.',
      next: 'Gunakan ?action=getGoogleReviews untuk mengambil ulasan.'
    });
  } catch (error) {
    return json_({ status: 'error', message: error.message });
  }
}

function getGoogleReviews_() {
  const properties = PropertiesService.getScriptProperties();
  const accountId = (properties.getProperty('GBP_ACCOUNT_ID') || '').trim();
  const locationId = (properties.getProperty('GBP_LOCATION_ID') || '').trim();

  if (!accountId || !locationId) {
    return json_({
      status: 'error',
      message: 'Tambahkan GBP_ACCOUNT_ID dan GBP_LOCATION_ID di Project Settings > Script Properties.'
    });
  }

  const reviews = [];
  let pageToken = '';

  for (let page = 0; page < 20; page++) {
    let url = 'https://mybusiness.googleapis.com/v4/accounts/' + encodeURIComponent(accountId) +
      '/locations/' + encodeURIComponent(locationId) + '/reviews?pageSize=50';
    if (pageToken) url += '&pageToken=' + encodeURIComponent(pageToken);

    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    const code = response.getResponseCode();
    const body = response.getContentText();

    if (code < 200 || code >= 300) {
      throw new Error('Google API HTTP ' + code + ': ' + body);
    }

    const data = JSON.parse(body || '{}');
    (data.reviews || []).forEach(function(review) {
      reviews.push({
        date: review.createTime ? review.createTime.slice(0, 10) : '',
        name: review.reviewer && review.reviewer.displayName ? review.reviewer.displayName : 'Anonim',
        rating: convertRating_(review.starRating),
        text: review.comment || ''
      });
    });

    pageToken = data.nextPageToken || '';
    if (!pageToken) break;
  }

  return json_({ status: 'success', reviews: reviews });
}

function convertRating_(value) {
  const ratings = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return ratings[String(value || '').toUpperCase()] || Number(value) || 0;
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
