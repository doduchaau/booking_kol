<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    public function test_health_check_endpoint_returns_ok(): void
    {
        $response = $this->get('/health');

        $response->assertOk();
        $response->assertJsonStructure([
            'status',
            'timestamp',
            'version',
            'checks' => [
                'database' => ['status'],
                'cache' => ['status'],
                'storage' => ['status'],
            ],
        ]);
        $response->assertJson([
            'status' => 'healthy',
            'checks' => [
                'database' => ['status' => 'ok'],
                'cache' => ['status' => 'ok'],
            ],
        ]);
    }
}

