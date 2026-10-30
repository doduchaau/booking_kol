<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'social_data_provider' => [
        'driver' => env('SOCIAL_DATA_PROVIDER_DRIVER', 'sandbox'), // rapidapi, apify, tikapi, http, sandbox
        'api_key' => env('SOCIAL_DATA_PROVIDER_API_KEY'),
        'base_url' => env('SOCIAL_DATA_PROVIDER_BASE_URL'),
        'api_host' => env('SOCIAL_DATA_PROVIDER_API_HOST'), // Dùng cho RapidAPI header X-RapidAPI-Host
    ],

    'kol_sync' => [
        'proxy_url' => env('KOL_SYNC_PROXY_URL', null), // socks5://127.0.0.1:40000 hoặc http proxy
        'python_path' => env('PYTHON_BINARY_PATH', 'python'),
        'user_data_dir' => env('KOL_SYNC_USER_DATA_DIR', null),
        'timeout' => (int) env('KOL_SYNC_TIMEOUT', 45),
    ],

];
