<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payments_invoice')) {
            return;
        }

        Schema::create('payments_invoice', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->string('invoice_number', 50);
            $table->integer('customer_id');
            $table->integer('payment_id')->nullable();
            $table->integer('license_id')->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('status', 20)->default('draft');
            $table->date('due_date');
            $table->dateTime('paid_at')->nullable();
            $table->dateTime('created_at');

            $table->unique('invoice_number');
            $table->unique('payment_id');
            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
