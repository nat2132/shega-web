<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable("admin_api_adminsession")) {
            return;
        }

        Schema::create("admin_api_adminsession", function (Blueprint $table): void {
            $table->integer("id", true);
            $table->integer("admin_id");
            $table->string("ip_address", 45)->nullable();
            $table->string("user_agent", 500)->default("");
            $table->dateTime("login_time");
            $table->dateTime("logout_time")->nullable();
            $table->boolean("is_active")->default(1);

            $table->index("admin_id");
            $table->primary("id");
        });
    }

    public function down(): void
    {
    }
};
