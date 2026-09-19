<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('customers_customerprofile')) {
            return;
        }

        Schema::create('customers_customerprofile', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->integer('user_id');
            $table->string('company_name', 255);
            $table->string('tin_number', 100)->default('');
            $table->string('city', 100)->default('');
            $table->string('region', 100)->default('');
            $table->string('country', 100)->default('Ethiopia');
            $table->string('website', 200)->default('');
            $table->string('status', 20)->default('active');
            $table->longText('notes');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->unique('user_id');
            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
