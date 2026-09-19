<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('licenses_licenseauditlog')) {
            return;
        }

        Schema::create('licenses_licenseauditlog', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->integer('license_id');
            $table->string('action', 20);
            $table->longText('details')->default('{}');
            $table->string('ip_address', 45)->nullable();
            $table->integer('created_by_id')->nullable();
            $table->dateTime('created_at');

            $table->index('action');
            $table->index('created_at');
            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
