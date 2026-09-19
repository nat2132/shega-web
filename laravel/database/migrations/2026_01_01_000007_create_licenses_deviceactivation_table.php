<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('licenses_deviceactivation')) {
            return;
        }

        Schema::create('licenses_deviceactivation', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->integer('license_id');
            $table->string('device_id', 255);
            $table->string('device_name', 255);
            $table->dateTime('activation_date');
            $table->dateTime('last_seen');
            $table->string('ip_address', 45);
            $table->string('operating_system', 255);
            $table->boolean('is_active')->default(true);

            $table->unique(['license_id', 'device_id']);
            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
