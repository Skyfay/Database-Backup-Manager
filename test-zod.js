const { z } = require('zod');

const schema = z.object({
  val: z.number()
});

const result = schema.safeParse({ val: 'not a number' });

if (!result.success) {
  console.log('Keys of result:', Object.keys(result));
  console.log('Keys of result.error:', Object.keys(result.error));
  console.log('result.error:', result.error);

  if (result.error.errors) {
    console.log('result.error.errors exists');
  } else {
    console.log('result.error.errors DOES NOT exist');
  }

  if (result.error.issues) {
    console.log('result.error.issues exists');
  }
}
