<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('admin_api_featureflag')) {
            return;
        }

        Schema::create('admin_api_featureflag', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->string('name', 255);
            $table->string('code', 100);
            $table->boolean('enabled')->default(false);
            $table->boolean('is_beta')->default(false);
            $table->string('description', 255)->default('');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->unique('code');
            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
