<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('admin_api_systemsetting')) {
            return;
        }

        Schema::create('admin_api_systemsetting', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->string('key', 255);
            $table->longText('value');
            $table->string('type', 20)->default('string');
            $table->string('description', 255)->default('');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->unique('key');
            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
