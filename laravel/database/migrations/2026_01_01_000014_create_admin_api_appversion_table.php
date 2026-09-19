<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('admin_api_appversion')) {
            return;
        }

        Schema::create('admin_api_appversion', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->string('platform', 20);
            $table->string('version', 20);
            $table->string('min_version', 20)->default('');
            $table->boolean('is_force_update')->default(false);
            $table->longText('release_notes')->default('');
            $table->string('download_url', 255)->default('');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->unique(['platform', 'version']);
            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
