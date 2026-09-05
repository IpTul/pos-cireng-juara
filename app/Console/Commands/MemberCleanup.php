<?php

namespace App\Console\Commands;

use App\Models\Member;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class MemberCleanup extends Command
{
    protected $signature = 'members:cleanup';
    protected $description = 'Cleanup inactive members: reset points after 3 months, soft delete after 6 months';

    public function handle(): int
    {
        $now = Carbon::now();

        // Reset points for members inactive > 3 months
        $inactive3Months = Member::inactive3Months()->get();
        $pointsResetCount = 0;

        foreach ($inactive3Months as $member) {
            if ($member->points > 0) {
                $member->resetPoints();
                $pointsResetCount++;
                $this->info("Reset points for member: {$member->name} ({$member->phone})");
            }
        }

        // Soft delete members inactive > 6 months
        $inactive6Months = Member::inactive6Months()->get();
        $softDeletedCount = 0;

        foreach ($inactive6Months as $member) {
            if (!$member->is_deleted) {
                $member->softDelete();
                $softDeletedCount++;
                $this->info("Soft deleted member: {$member->name} ({$member->phone})");
            }
        }

        $this->info("Cleanup completed: {$pointsResetCount} members had points reset, {$softDeletedCount} members soft deleted.");

        return Command::SUCCESS;
    }
}