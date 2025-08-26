import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const { name, email, clerkId } = await request.json();

    if (!name || !email || !clerkId) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT * FROM users WHERE email = ${email} OR clerk_id = ${clerkId}
    `;

    if (existingUser.length > 0) {
      return Response.json({ error: "User already exists" }, { status: 409 });
    }

    const response = await sql`
      INSERT INTO users (
        name, 
        email, 
        clerk_id
      ) 
      VALUES (
        ${name}, 
        ${email},
        ${clerkId}
      )
      RETURNING *;`;

    return new Response(JSON.stringify({ data: response[0] }), {
      status: 201,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const { name, email, clerkId } = await request.json();

    if (!email || !clerkId) {
      return Response.json({ error: "Email and clerkId are required" }, { status: 400 });
    }

    // Update user by email (since we might not have the clerkId initially)
    const response = await sql`
      UPDATE users 
      SET 
        clerk_id = ${clerkId},
        name = COALESCE(${name}, name),
        updated_at = NOW()
      WHERE email = ${email}
      RETURNING *;`;

    if (response.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return new Response(JSON.stringify({ data: response[0] }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const url = new URL(request.url);
    const clerkId = url.searchParams.get("clerkId");
    const email = url.searchParams.get("email");

    if (!clerkId && !email) {
      return Response.json({ error: "ClerkId or email is required" }, { status: 400 });
    }

    let response;
    if (clerkId) {
      response = await sql`SELECT * FROM users WHERE clerk_id = ${clerkId}`;
    } else {
      response = await sql`SELECT * FROM users WHERE email = ${email}`;
    }

    if (response.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return new Response(JSON.stringify({ data: response[0] }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
