<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('admin_api_supportticket')) {
            return;
        }

        Schema::create('admin_api_supportticket', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->integer('business_id');
            $table->string('subject', 255);
            $table->longText('message')->default('');
            $table->string('status', 20)->default('open');
            $table->string('priority', 20)->default('medium');
            $table->integer('assigned_to_id')->nullable();
            $table->dateTime('last_replied_at')->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->index('business_id');
            $table->index('status');
            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
