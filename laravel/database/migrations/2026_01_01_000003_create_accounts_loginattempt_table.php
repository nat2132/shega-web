<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('accounts_loginattempt')) {
            return;
        }

        Schema::create('accounts_loginattempt', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->string('identifier', 254);
            $table->string('ip_address', 45);
            $table->integer('user_id')->nullable();
            $table->boolean('success')->default(false);
            $table->string('outcome', 10)->default('');
            $table->longText('user_agent')->nullable();
            $table->dateTime('timestamp');

            $table->index(['identifier', 'timestamp']);
            $table->index(['ip_address', 'timestamp']);
            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
