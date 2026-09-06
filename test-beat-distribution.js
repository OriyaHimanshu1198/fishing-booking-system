// Test script to verify perfect cyclic rotation algorithm
import { autoAssignBeats, getBeatDistribution, BEATS } from './src/utils/dateHelpers.js'

// Mock data
const mockBookings = [];
const allDays = [0, 1, 2, 3, 4, 5]; // Mon-Sat

console.log('Testing Perfect Cyclic Rotation (6 bookings × 6 days)\n');
console.log('Expected pattern:');
console.log('  Booking 1: Beat 1, Beat 2, Beat 3, Beat 4, Beat 5, Loch');
console.log('  Booking 2: Beat 2, Beat 3, Beat 4, Beat 5, Loch, Beat 1');
console.log('  Booking 3: Beat 3, Beat 4, Beat 5, Loch, Beat 1, Beat 2');
console.log('  Booking 4: Beat 4, Beat 5, Loch, Beat 1, Beat 2, Beat 3');
console.log('  Booking 5: Beat 5, Loch, Beat 1, Beat 2, Beat 3, Beat 4');
console.log('  Booking 6: Loch, Beat 1, Beat 2, Beat 3, Beat 4, Beat 5\n');

console.log('--- Actual Results ---');

// Create 6 bookings
for (let i = 1; i <= 6; i++) {
  const allocations = autoAssignBeats(1, allDays, mockBookings);

  if (!allocations) {
    console.log(`Booking ${i}: FAILED - No available beats`);
    break;
  }

  // Format output as readable array
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const formatted = allDays.map(d => allocations[d]).join(', ');
  console.log(`Booking ${i}: ${formatted}`);

  // Add booking to mock data
  mockBookings.push({
    id: i,
    week: 1,
    beat_allocations: allocations
  });
}

console.log('\n--- Verification ---');

// Check 1: Each booking uses all 6 beats (no repeats within booking)
let allUnique = true;
mockBookings.forEach((booking, index) => {
  const beats = Object.values(booking.beat_allocations);
  const uniqueBeats = new Set(beats);
  if (uniqueBeats.size !== 6) {
    console.log(`❌ Booking ${index + 1}: Has duplicate beats`);
    allUnique = false;
  }
});
if (allUnique) console.log('✅ All bookings use unique beats (no repeats within booking)');

// Check 2: Each beat used exactly once per day across all bookings
const distribution = getBeatDistribution(1, mockBookings);
let allBalanced = true;
BEATS.forEach(beat => {
  const d = distribution[beat];
  const dailyUsageOk = d.dailyUsage.every(count => count <= 1);
  if (!dailyUsageOk) {
    console.log(`❌ ${beat}: Used more than once on same day`);
    allBalanced = false;
  }
});
if (allBalanced) console.log('✅ Each beat used exactly once per day across all bookings');

// Show distribution table
console.log('\n--- Distribution Table ---');
console.log('Booking | Mon    | Tue    | Wed    | Thu    | Fri    | Sat');
console.log('--------|--------|--------|--------|--------|--------|--------');
mockBookings.forEach((booking, index) => {
  const beats = allDays.map(d => booking.beat_allocations[d].padEnd(6)).join(' | ');
  console.log(`  ${index + 1}     | ${beats}`);
});

console.log('\nTest complete.');