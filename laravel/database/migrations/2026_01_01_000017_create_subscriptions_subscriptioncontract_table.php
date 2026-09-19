<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('subscriptions_subscriptioncontract')) {
            return;
        }

        Schema::create('subscriptions_subscriptioncontract', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->integer('business_id');
            $table->integer('plan_id');
            $table->string('status', 20)->default('active');
            $table->dateTime('current_period_start');
            $table->dateTime('current_period_end');
            $table->dateTime('cancel_at_period_end_at')->nullable();
            $table->boolean('auto_renew')->default(true);
            $table->string('payment_method', 20)->default('telebirr');
            $table->string('notes', 500)->default('');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->index('business_id');
            $table->index('status');
            $table->index('current_period_end');
            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
