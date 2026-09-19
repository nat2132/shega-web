<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payments_payment')) {
            return;
        }

        Schema::create('payments_payment', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->integer('customer_id');
            $table->string('transaction_id', 100);
            $table->string('status', 15)->default('pending');
            $table->string('channel', 20)->default('telebirr');
            $table->string('operator_number', 100)->default('');
            $table->string('plan_id_ref', 100)->nullable();
            $table->string('card_holder', 150)->default('');
            $table->string('card_last4', 4)->default('');
            $table->decimal('amount', 10, 2);
            $table->longText('notes')->default('');
            $table->string('receipt_image', 255)->default('');
            $table->integer('license_id')->nullable();
            $table->integer('reviewed_by_id')->nullable();
            $table->dateTime('reviewed_at')->nullable();
            $table->dateTime('created_at');

            $table->index('status');
            $table->index('customer_id');
            $table->index('created_at');
            $table->unique('transaction_id');
            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
