<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('licenses_license')) {
            return;
        }

        Schema::create('licenses_license', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->string('license_key', 20);
            $table->integer('customer_id');
            $table->integer('plan_id');
            $table->string('status', 20)->default('active');
            $table->date('start_date');
            $table->date('expiry_date')->nullable();
            $table->integer('device_limit');
            $table->longText('notes')->default('');
            $table->boolean('is_trial')->default(false);
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->unique('license_key');
            $table->index('status');
            $table->index(['license_key', 'status']);
            $table->index('expiry_date');
            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
