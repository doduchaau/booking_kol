<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'Admin']);
        Role::firstOrCreate(['name' => 'Leader']);
        Role::firstOrCreate(['name' => 'Staff']);
    }

    public function test_admin_can_update_staff_information(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $staff = User::factory()->create([
            'name' => 'Staff Cu',
            'email' => 'staff_cu@example.com',
            'phone' => '0901111111',
            'is_active' => true,
        ]);
        $staff->assignRole('Staff');

        $response = $this->actingAs($admin)->put(route('settings.users.update', $staff->id), [
            'name' => 'Staff Moi',
            'email' => 'staff_moi@example.com',
            'phone' => '0987654321',
            'is_active' => 0,
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success');

        $staff->refresh();
        $this->assertSame('Staff Moi', $staff->name);
        $this->assertSame('staff_moi@example.com', $staff->email);
        $this->assertSame('0987654321', $staff->phone);
        $this->assertFalse((bool) $staff->is_active);
    }

    public function test_non_admin_cannot_update_staff_information(): void
    {
        $staff1 = User::factory()->create();
        $staff1->assignRole('Staff');

        $staff2 = User::factory()->create([
            'name' => 'Staff 2',
            'email' => 'staff2@example.com',
        ]);
        $staff2->assignRole('Staff');

        $response = $this->actingAs($staff1)->put(route('settings.users.update', $staff2->id), [
            'name' => 'Hack Name',
            'email' => 'hack@example.com',
            'is_active' => 1,
        ]);

        // Non-admin without permissions is rejected (403 or redirect depending on middleware)
        $this->assertTrue(in_array($response->status(), [403, 302]));
    }

    public function test_admin_cannot_deactivate_self(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $response = $this->actingAs($admin)->put(route('settings.users.update', $admin->id), [
            'name' => $admin->name,
            'email' => $admin->email,
            'is_active' => 0,
        ]);

        $response->assertSessionHasErrors('is_active');
        $this->assertTrue((bool) $admin->fresh()->is_active);
    }

    public function test_admin_can_reset_staff_password(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $staff = User::factory()->create([
            'password' => Hash::make('old-password-123'),
        ]);
        $staff->assignRole('Staff');

        $response = $this->actingAs($admin)->put(route('settings.users.password.reset', $staff->id), [
            'password' => 'NewSecurePass@2026',
            'password_confirmation' => 'NewSecurePass@2026',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success');

        $this->assertTrue(Hash::check('NewSecurePass@2026', $staff->fresh()->password));
    }
}

