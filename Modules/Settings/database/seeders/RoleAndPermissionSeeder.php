<?php

namespace Modules\Settings\Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleAndPermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Tạo các quyền hạn (Permissions)
        $permissions = [
            'manage_settings',
            'delete_campaigns',
            'approve_campaign_budget',
            'manage_campaigns',
            'manage_creators',
            'view_reports',
        ];

        foreach ($permissions as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        }

        // 2. Tạo các vai trò (Roles)
        // Admin
        $adminRole = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        $adminRole->syncPermissions(Permission::all());

        // Leader
        $leaderRole = Role::firstOrCreate(['name' => 'Leader', 'guard_name' => 'web']);
        $leaderRole->syncPermissions([
            'delete_campaigns',
            'approve_campaign_budget',
            'manage_campaigns',
            'manage_creators',
            'view_reports',
        ]);

        // Staff
        $staffRole = Role::firstOrCreate(['name' => 'Staff', 'guard_name' => 'web']);
        $staffRole->syncPermissions([
            'manage_campaigns',
            'manage_creators',
            'view_reports',
        ]);

        // 3. Tạo tài khoản Admin nếu chưa có và gán quyền
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@bookingkol.vn'],
            [
                'name' => 'Nguyễn Quản Trị (Admin)',
                'password' => Hash::make('password'),
            ]
        );
        $adminUser->syncRoles([$adminRole]);

        // 4. Tạo tài khoản Leader & Staff mẫu nếu chưa có
        $leaderUser = User::firstOrCreate(
            ['email' => 'leader@bookingkol.vn'],
            [
                'name' => 'Trần Trưởng Nhóm (Leader)',
                'password' => Hash::make('password'),
            ]
        );
        $leaderUser->syncRoles([$leaderRole]);

        $staffUser = User::firstOrCreate(
            ['email' => 'staff@bookingkol.vn'],
            [
                'name' => 'Lê Nhân Viên (Staff)',
                'password' => Hash::make('password'),
            ]
        );
        $staffUser->syncRoles([$staffRole]);
    }
}
