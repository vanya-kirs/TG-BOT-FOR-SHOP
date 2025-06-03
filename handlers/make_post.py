from aiogram import types, Router, F, Bot
import os
from aiogram.enums import ParseMode
from aiogram.filters import  Command
from aiogram.types import CallbackQuery
from aiogram.utils.media_group import MediaGroupBuilder
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.context import FSMContext
from common.calendar import calendar_day, calendar_time, calendar_month
from datetime import datetime, date
from filters.chat_types import ChatTypeFilter, IsAdmin
from aiogram.types import InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder
from database.orm_query import orm_make_post, orm_get_post, orm_get_categories, orm_get_all_post, orm_delete_post, orm_add_product_post
from aiogram.types import KeyboardButton, ReplyKeyboardMarkup
from kbds.inline import get_callback_btns
from sqlalchemy.ext.asyncio import AsyncSession
from database.engine import session_maker
import datetime
from aiogram.client.bot import DefaultBotProperties
from config import CHANNEL_ID, ADMIN_USERNAME, SUPPORT_USERNAME

bot = Bot(token=os.getenv('TOKEN'), default=DefaultBotProperties(parse_mode=ParseMode.HTML))

post_router = Router()
post_router.message.filter(ChatTypeFilter(["private"]), IsAdmin())

class AddMeet(StatesGroup):
    # Шаги состояний
    ask = State()
    photo1 = State()
    photo2 = State()
    product_linc = State()
    product_name = State()
    price = State()
    day = State()
    time = State()
    month = State()
    date = State()
    send = State()
    category = State()
    description = State()
    delete_post = State()
    bot_photo = State()

change_kb=ReplyKeyboardMarkup(keyboard=[
          [KeyboardButton(text='Сделать пост'), KeyboardButton(text='Отменить пост')],
          [KeyboardButton(text='Посты на сегодня')]
    ],
    resize_keyboard=True,
    input_field_placeholder='Чем могу быть полезен?'
)

def yes_no():
    yes_no = InlineKeyboardBuilder()
    yes_no.add(InlineKeyboardButton(text='да', callback_data='yes'))
    yes_no.add(InlineKeyboardButton(text='нет', callback_data='no'))
    return yes_no.as_markup()

def send_no():
    yes_no = InlineKeyboardBuilder()
    yes_no.add(InlineKeyboardButton(text='Все верно', callback_data='send'))
    yes_no.add(InlineKeyboardButton(text='Где-то ошибка', callback_data='no_send'))
    return yes_no.as_markup()

def delete():
    yes_no = InlineKeyboardBuilder()
    yes_no.add(InlineKeyboardButton(text='удалить', callback_data='delete'))
    return yes_no.as_markup()

def f_s():
    yes_no = InlineKeyboardBuilder()
    yes_no.add(InlineKeyboardButton(text='Первое', callback_data='1'))
    yes_no.add(InlineKeyboardButton(text='Второе', callback_data='2'))
    return yes_no.as_markup()

@post_router.message(Command('post'))
async def post(message: types.Message):
    await message.answer('Ты в каком-то меню', reply_markup=change_kb)


@post_router.message(F.text=='отменить')
async def otmena(message: types.Message, state: FSMContext):
    await state.clear()
    await message.answer('Действия отменены', reply_markup=change_kb)


@post_router.message(F.text=='Сделать пост')
async def post(message: types.Message, state: FSMContext):
    await message.answer('Введите фото товара')
    await state.set_state(AddMeet.photo1)


@post_router.message(F.photo, AddMeet.photo1)
async def wait_photo1(message: types.Message, state: FSMContext):
    await state.update_data(photo1=message.photo[-1].file_id)
    await message.answer('Есть ли еще фото?', reply_markup=yes_no())
    await state.set_state(AddMeet.ask)

@post_router.callback_query(AddMeet.ask, F.data)
async def ask(callback: CallbackQuery, state: FSMContext):
    if callback.data=='yes':
        await callback.message.delete()
        await callback.message.answer('Пишлите второе фото')
        await state.set_state(AddMeet.photo2)
    else:
        await state.update_data(photo2='no')
        await callback.message.delete()
        await callback.message.answer('Пришлите название товара')
        await state.set_state(AddMeet.product_name)


@post_router.message(F.photo, AddMeet.photo2)
async def wait_photo2(message: types.Message, state: FSMContext):
    await state.update_data(photo2=message.photo[-1].file_id)
    await message.answer('Какое фото использовать в боте?', reply_markup=f_s())
    await state.set_state(AddMeet.bot_photo)

@post_router.callback_query(F.data, AddMeet.bot_photo)
async def write_bot_photo(callback: CallbackQuery, state: FSMContext):
    meet=await state.get_data()
    if callback.data=='1':
        await callback.message.delete()
        await callback.answer()
        await state.update_data(bot_photo=meet['photo1'])
    if callback.data=='2':
        await callback.message.delete()
        await callback.answer()
        await state.update_data(bot_photo=meet['photo2'])
    await callback.message.answer('Отлично, теперь название товара')
    await state.set_state(AddMeet.product_name)


@post_router.message(F.text, AddMeet.product_name)
async def wait_linc(message: types.Message, state: FSMContext):
    await state.update_data(product_name=message.text)
    await message.answer('Пришлите ссылку через https')
    await state.set_state(AddMeet.product_linc)


@post_router.message(F.text, AddMeet.product_linc)
async def write_linc(message: types.Message, state: FSMContext):
    await state.update_data(product_linc=message.text)
    await message.answer('Выберите цену')
    await state.set_state(AddMeet.price)

@post_router.message(F.text, AddMeet.price)
async def write_price(message: types.Message, state: FSMContext, session: AsyncSession):
    await state.update_data(price=message.text)
    categories = await orm_get_categories(session)
    btns = {category.name: str(category.id) for category in categories}
    await message.answer("Выберите категорию", reply_markup=get_callback_btns(btns=btns))
    await state.set_state(AddMeet.category)

@post_router.callback_query(F.data, AddMeet.category)
async def write_linc(callback: CallbackQuery, state: FSMContext):
    await state.update_data(category=callback.data)
    await callback.answer()
    await callback.message.answer('Выберите описание товара для бота')
    await state.set_state(AddMeet.description)




@post_router.message(F.text, AddMeet.description)
async def write_description(message: types.Message, state: FSMContext):
    await state.update_data(description=message.text)
    await message.answer('Отлично! Теперь время, в которое будет выложен пост!', reply_markup=await calendar_month())
    await state.set_state(AddMeet.month)


@post_router.callback_query(F.data=='year')
async def calendaric_year(callback: CallbackQuery):
    current_year = str(datetime.now().year)
    await callback.answer(f'Текущий год-{current_year}')


@post_router.callback_query(F.data=='weekday')
@post_router.callback_query(F.data=='month')
async def calendaric_month(callback: CallbackQuery, state: FSMContext):
    meet=await state.get_data()
    month = meet['month']
    await callback.answer(f'Текущий месяц-{month}')


@post_router.callback_query(AddMeet.month)
async def calendaric_month(callback: CallbackQuery, state: FSMContext):
    month=callback.data
    await state.update_data(month=month)
    await callback.message.edit_text('Выберите дату', reply_markup=await calendar_day(month))
    await state.set_state(AddMeet.day)


@post_router.callback_query(AddMeet.day)
async def calendaric_day(callback: CallbackQuery, state: FSMContext):
    day=callback.data
    if day=='назад':
        await callback.message.edit_text('Выберите месяц', reply_markup=await calendar_month())
        await state.set_state(AddMeet.month)
    else:
        await state.update_data(day=day)
        meet = await state.get_data()
        month = meet['month']
        day = meet['day']
        if int(day) < 10:
            day = '0' + day
        months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
                  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
        month = str(months.index(month) + 1)
        if int(month) < 10:
            month = '0' + month
        date = day + '.' + month
        await callback.message.edit_text('Выберите время', reply_markup=await calendar_time(date))
        await state.set_state(AddMeet.time)


@post_router.callback_query(AddMeet.time)
async def select_name(callback: CallbackQuery, state: FSMContext, bot:Bot):
        time=callback.data
        await state.update_data(time=time)
        meet = await state.get_data()
        month = meet['month']
        day = meet['day']
        time = meet['time']
        product_name = meet['product_name']
        product_linc = meet['product_linc']
        price = meet['price']
        photo1 = meet['photo1']
        photo2 = meet['photo2']
        if time=='назад':
            await callback.message.edit_text('Выберите дату', reply_markup=await calendar_day(month))
            await state.set_state(AddMeet.day)
        else:
            await callback.message.delete()

            if int(day)<10:
                day='0'+day
            months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
                      'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
            month=str(months.index(month)+1)
            if int(month)<10:
                month='0'+month
            date=day+'.'+month
            await state.update_data(date=date)
            linc_name = f'<a href="{product_linc}">{product_name}</a>'
            message_to_answer=f'#order\n\n{linc_name}\n\n'
            message_to_answer+=f'<b>Цена - от {price}  рублей (без учета доставки)\n\nНаличие размера уточняйте в лс\n\nДанная цена может меняться в зависимости от вашего размера\n\nДля заказа писать - {ADMIN_USERNAME}\nСлужба поддержки - {SUPPORT_USERNAME}</b>'
            photos = MediaGroupBuilder(
                caption=message_to_answer
            )
            photos.add_photo(media=photo1)
            if photo2 != 'no':
                photos.add_photo(media=photo2)
            if photo2 == 'no':
                await state.update_data(bot_photo=photo1)
            await callback.message.answer(f'Отлично, пост будет выложен в {date} в {time}')
            await bot.send_media_group(callback.message.chat.id, media=photos.build())
            await callback.message.answer('Все ли верно?', reply_markup=send_no())
            await state.set_state(AddMeet.send)


@post_router.callback_query(AddMeet.send, F.data)
async def ask(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    if callback.data=='send':
        meet=await state.get_data()
        await callback.message.delete()
        await callback.answer()
        await orm_make_post(session, meet)
        await callback.message.answer('Принял, жди пост!', reply_markup=change_kb)
        await state.clear()
    else:
        await callback.message.delete()
        await callback.message.answer('Ну и ладно(', reply_markup=change_kb)
        await state.clear()


@post_router.message(F.text=='Посты на сегодня')
async def post(message: types.Message, session: AsyncSession, bot: Bot):
    await message.answer('Вот список постов на сегодня:')
    date_today = str(date.today())[5:].replace('-', '.').split('.')
    date_today=date_today[1]+'.'+date_today[0]
    x =0
    for post in await orm_get_post(session, date_today):
            linc_name = f'<a href="{post.product_linc}">{post.product_name}</a>'
            message_to_answer = f'#order\n\n{linc_name}\n\nЦена - от {post.price}  рублей (без учета доставки)\n\nНаличие размера уточняйте в лс\n\nДанная цена может меняться в зависимости от вашего размера\n\nДля заказа писать - {ADMIN_USERNAME}\nСлужба поддержки - {SUPPORT_USERNAME}'
            photos=MediaGroupBuilder(
                caption=message_to_answer
            )
            photos.add_photo(media=post.photo1)
            if post.photo2!='no':
                photos.add_photo(media=post.photo2)
            await bot.send_media_group(message.chat.id, media=photos.build())
            x+=1
    if x==0:
        await message.answer('Постов на сегодня нет(')

@post_router.message(F.text=='Отменить пост')
async def post(message: types.Message, session: AsyncSession, bot: Bot, state: FSMContext):
    await message.answer('Вот список всех постов:')
    x=0
    for post in await orm_get_all_post(session):
        linc_name = f'<a href="{post.product_linc}">{post.product_name}</a>'
        message_to_answer = f'#order\n\n{linc_name}\n\n'
        message_to_answer+=f'<b>Цена - от {post.price}  рублей (без учета доставки)\n\nНаличие размера уточняйте в лс\n\nДанная цена может меняться в зависимости от вашего размера\n\nДля заказа писать - {ADMIN_USERNAME}\nСлужба поддержки - {SUPPORT_USERNAME}</b>'
        photos=MediaGroupBuilder(
            caption=message_to_answer
        )
        photos.add_photo(media=post.photo1)
        if post.photo2!='no':
            photos.add_photo(media=post.photo2)
        await bot.send_media_group(message.chat.id, media=photos.build())
        x+=1
    if x==0:
        await message.answer('Постов нет на сегодня(')
    else:
        await message.answer('Введите название поста, который хотите удалить')
        await state.set_state(AddMeet.delete_post)



@post_router.message(F.text, AddMeet.delete_post)
async def delete_post_(message: types.Message, state: FSMContext, session: AsyncSession):
    await state.update_data(delete_post=message.text)
    meet = await state.get_data()
    x=0
    for post in await orm_get_all_post(session):
        if meet['delete_post']==post.product_name:
            await orm_delete_post(session, meet['delete_post'])
            await message.answer('Пост удален', reply_markup=change_kb)
            await state.clear()
            x+=1
    if x==0:
        await message.answer('Такого поста нет', reply_markup=change_kb)
        await state.clear()





@post_router.message(F.text=='1234')
async def post_load():
    time_today =datetime.datetime.now().time()
    date_today = datetime.datetime.now().date()
    date_today=str(date_today)[5:].split('-')
    date_today=date_today[1]+'.'+date_today[0]
    async with session_maker() as session:
        for post in await orm_get_post(session, date_today):
            post_time=str(post.time).split(':')
            h=int(post_time[0])
            m=int(post_time[1])
            posttime=datetime.time(hour=h, minute=m)
            if posttime<time_today:
                linc_name = f'<a href="{post.product_linc}">{post.product_name}</a>'
                message_to_answer = f'#order\n\n{linc_name}\n\n'
                message_to_answer+=f'<b>Цена - от {post.price}  рублей (без учета доставки)\n\nНаличие размера уточняйте в лс\n\nДанная цена может меняться в зависимости от вашего размера\n\nДля заказа писать - {ADMIN_USERNAME}\nСлужба поддержки - {SUPPORT_USERNAME}</b>'
                photos=MediaGroupBuilder(
                    caption=message_to_answer
                )
                photos.add_photo(media=post.photo1)
                if post.photo2!='no':
                    photos.add_photo(media=post.photo2)
                await bot.send_media_group(chat_id=CHANNEL_ID, media=photos.build())
                await orm_add_product_post(session, post)
                await orm_delete_post(session, post.product_name)

