<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('admin_api_auditlog')) {
            return;
        }

        Schema::create('admin_api_auditlog', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->integer('admin_id')->nullable();
            $table->string('action', 100);
            $table->string('resource_type', 100);
            $table->integer('resource_id')->nullable();
            $table->string('resource_label', 255)->default('');
            $table->longText('before_state')->default('null');
            $table->longText('after_state')->default('null');
            $table->longText('metadata')->default('{}');
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->default('');
            $table->dateTime('created_at');

            $table->index('admin_id');
            $table->index('action');
            $table->index('resource_type');
            $table->index('created_at');
            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
