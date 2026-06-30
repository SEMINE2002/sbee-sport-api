<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],

    // Origines autorisées (dev local + front Vercel via env)
    'allowed_origins' => array_filter([
        'http://localhost:5173',
        env('FRONTEND_URL', 'https://sbee-projet-sportif.vercel.app'),
    ]),

    // Autorise aussi les preview deployments Vercel (sbee-projet-sportif-*.vercel.app)
    'allowed_origins_patterns' => [
        '#^https://sbee-projet-sportif.*\.vercel\.app$#',
    ],

    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
