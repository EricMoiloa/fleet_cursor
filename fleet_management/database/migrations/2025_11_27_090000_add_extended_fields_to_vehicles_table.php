<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            if (!Schema::hasColumn('vehicles', 'ownership_type')) {
                $table->enum('ownership_type', ['owned', 'hired'])
                    ->default('owned')
                    ->after('department_id');
            }

            if (!Schema::hasColumn('vehicles', 'contract_end_date')) {
                $table->date('contract_end_date')->nullable()->after('ownership_type');
            }

            if (!Schema::hasColumn('vehicles', 'insurance_document_path')) {
                $table->string('insurance_document_path')->nullable()->after('contract_end_date');
            }

            if (!Schema::hasColumn('vehicles', 'insurance_expires_at')) {
                $table->date('insurance_expires_at')->nullable()->after('insurance_document_path');
            }

            if (!Schema::hasColumn('vehicles', 'monthly_mileage_limit')) {
                $table->unsignedInteger('monthly_mileage_limit')->nullable()->after('insurance_expires_at');
            }

            if (!Schema::hasColumn('vehicles', 'month_to_date_mileage')) {
                $table->unsignedInteger('month_to_date_mileage')->default(0)->after('monthly_mileage_limit');
            }

            if (!Schema::hasColumn('vehicles', 'mileage_period_start')) {
                $table->date('mileage_period_start')->nullable()->after('month_to_date_mileage');
            }

            if (!Schema::hasColumn('vehicles', 'next_service_odometer')) {
                $table->unsignedInteger('next_service_odometer')->nullable()->after('odometer');
            }

            if (!Schema::hasColumn('vehicles', 'last_serviced_at')) {
                $table->date('last_serviced_at')->nullable()->after('next_service_odometer');
            }

            if (!Schema::hasColumn('vehicles', 'retired_at')) {
                $table->timestamp('retired_at')->nullable()->after('last_serviced_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $columns = [
                'ownership_type',
                'contract_end_date',
                'insurance_document_path',
                'insurance_expires_at',
                'monthly_mileage_limit',
                'month_to_date_mileage',
                'mileage_period_start',
                'next_service_odometer',
                'last_serviced_at',
                'retired_at',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('vehicles', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

