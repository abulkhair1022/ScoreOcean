// Test script to verify notification sending works
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'score_ocean',
  user: 'postgres',
  password: 'Okayyraisa'
});

async function testPublishNotification() {
  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Get a DRAFT tournament
    const draftResult = await client.query(
      "SELECT id, name, format, sport FROM tournaments WHERE status = 'DRAFT' LIMIT 1"
    );

    if (draftResult.rows.length === 0) {
      console.log('✗ No DRAFT tournaments found. Create one first.');
      return;
    }

    const tournament = draftResult.rows[0];
    console.log('Found DRAFT tournament:');
    console.log(`  ID: ${tournament.id}`);
    console.log(`  Name: ${tournament.name}`);
    console.log(`  Format: ${tournament.format}`);
    console.log(`  Sport: ${tournament.sport}\n`);

    // Count potential recipients
    if (tournament.format === 'LEAGUE') {
      const playerCount = await client.query(
        "SELECT COUNT(*) FROM users WHERE role = 'PLAYER'"
      );
      console.log(`Potential recipients (Players): ${playerCount.rows[0].count}\n`);
    } else {
      const teamCount = await client.query(
        "SELECT COUNT(DISTINCT host_id) FROM teams WHERE sport = $1",
        [tournament.sport]
      );
      console.log(`Potential recipients (Team hosts with ${tournament.sport}): ${teamCount.rows[0].count}\n`);
    }

    // Update status to REGISTRATION_OPEN (simulating publish)
    console.log('Publishing tournament (updating status)...');
    await client.query(
      "UPDATE tournaments SET status = 'REGISTRATION_OPEN' WHERE id = $1",
      [tournament.id]
    );
    console.log('✓ Status updated to REGISTRATION_OPEN\n');

    // Check if notifications were created
    const notificationCount = await client.query(
      "SELECT COUNT(*) FROM notifications WHERE data->>'tournamentId' = $1",
      [tournament.id]
    );

    console.log(`Notifications created: ${notificationCount.rows[0].count}`);

    if (notificationCount.rows[0].count === '0') {
      console.log('\n⚠ WARNING: No notifications were created!');
      console.log('This means the notification code in the service layer was NOT triggered.');
      console.log('The SQL UPDATE bypasses the service layer.\n');
      console.log('To fix: Use the API endpoint /tournaments/:id/publish instead of direct SQL.');
    } else {
      console.log('✓ Notifications were created successfully!\n');
      
      // Show sample notifications
      const sampleNotifications = await client.query(
        `SELECT n.user_id, u.email, n.title, n.message, n.created_at
         FROM notifications n
         JOIN users u ON n.user_id = u.id
         WHERE n.data->>'tournamentId' = $1
         LIMIT 3`,
        [tournament.id]
      );

      console.log('Sample notifications:');
      sampleNotifications.rows.forEach((n, i) => {
        console.log(`\n  ${i + 1}. To: ${n.email}`);
        console.log(`     Title: ${n.title}`);
        console.log(`     Message: ${n.message}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

testPublishNotification();
