import test from 'node:test';
import assert from 'node:assert/strict';
import {daysInMonth,birthdayValue,birthdayField} from '../dist/birthday.js';
test('birthday selector preserves dates and handles leap years without inventing a day',()=>{
 assert.equal(daysInMonth(2000,2),29);assert.equal(daysInMonth(1900,2),28);assert.equal(daysInMonth(2023,4),30);
 assert.equal(birthdayValue('2000','2','29'),'2000-02-29');assert.equal(birthdayValue('2023','2','29'),'');assert.equal(birthdayValue('','2','1'),'');
 const field=birthdayField('1995-07-12');assert.match(field,/name="birthday" value="1995-07-12"/);assert.match(field,/Июль/);assert.doesNotMatch(field,/type="date"/);
 assert.match(birthdayField(),/name="birthday" value=""/);
});
