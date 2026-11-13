<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'KOL Booking Tool') }}</title>
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <!-- Favicon -->
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v={{ file_exists(public_path('favicon.ico')) ? filemtime(public_path('favicon.ico')) : 1 }}">
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v={{ file_exists(public_path('favicon-32x32.png')) ? filemtime(public_path('favicon-32x32.png')) : 1 }}">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

        <!-- Google / Bunny Fonts hỗ trợ tiếng Việt mượt mà -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700|be-vietnam-pro:400,500,600,700|figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased bg-slate-50 text-slate-800">
        @inertia
    </body>
</html>
