<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('notifications_notification')) {
            return;
        }

        Schema::create('notifications_notification', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->integer('recipient_id');
            $table->string('notification_type', 30);
            $table->string('title', 255);
            $table->longText('body')->default('');
            $table->longText('data')->default('{}');
            $table->boolean('is_read')->default(false);
            $table->dateTime('created_at');

            $table->index('recipient_id');
            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
