<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('licenses_licenseplan')) {
            return;
        }

        Schema::create('licenses_licenseplan', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->string('name', 100);
            $table->integer('duration_months');
            $table->integer('device_limit')->default(1);
            $table->decimal('price', 10, 2);
            $table->boolean('is_active')->default(true);
            $table->dateTime('created_at');

            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
