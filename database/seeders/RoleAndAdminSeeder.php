<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleAndAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Tạo các vai trò chuẩn của hệ thống
        $adminRole = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Leader', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Staff', 'guard_name' => 'web']);

        // 2. Gán quyền Admin cho tài khoản admin đầu tiên
        $adminUser = User::where('email', 'admin@bookingkol.vn')->first() ?? User::find(1);
        if ($adminUser && !$adminUser->hasRole('Admin')) {
            $adminUser->assignRole($adminRole);
        }
    }
}

