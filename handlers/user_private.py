from aiogram import F, types, Router, Bot
from aiogram.filters import CommandStart

from aiogram.types import FSInputFile
from aiogram import Bot
from sqlalchemy.ext.asyncio import AsyncSession
from database.orm_query import (
    orm_add_to_cart,
    orm_add_user,
)

from filters.chat_types import ChatTypeFilter
from handlers.menu_processing import get_menu_content
from kbds.inline import MenuCallBack, get_callback_btns
from config import SHOP_CHANNEL, SHOP_CHANNEL_LINK, ADMIN_IDS

from database.orm_query import orm_get_cart, orm_get_user_id_to_cart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup



user_private_router = Router()
user_private_router.message.filter(ChatTypeFilter(["private"]))


@user_private_router.message(CommandStart())
async def start_cmd(message: types.Message, session: AsyncSession, bot:Bot):






    #user_chanel_status=await bot.get_chat_member(chat_id=SHOP_CHANNEL, user_id=message.from_user.id)
    #if user_chanel_status.status!='left':
        media, reply_markup = await get_menu_content(session, level=0, menu_name="main")

        await message.answer_photo(media.media, caption=media.caption, reply_markup=reply_markup)


    #else:
     #   await message.answer(f'Для использование этого бота нужно подписаться на нас! \n'
      #                   f'После подписки нажми еще раз на "/start"\n{SHOP_CHANNEL_LINK}')






class Send_administrator(StatesGroup):
    # Шаги состояний
    client_id = State()
    send_photo = State()


async def add_to_cart(callback: types.CallbackQuery, callback_data: MenuCallBack, session: AsyncSession):
    user = callback.from_user
    await orm_add_user(
        session,
        user_id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=None,
    )
    await orm_add_to_cart(session, user_id=user.id, product_id=callback_data.product_id)
    await callback.answer("Товар добавлен в корзину.")


@user_private_router.callback_query(MenuCallBack.filter())
async def user_menu(callback: types.CallbackQuery, callback_data: MenuCallBack, session: AsyncSession, bot: Bot):
    if callback_data.menu_name == 'send':
        id_admin = ADMIN_IDS[0]  # Берем первого администратора из списка
        id_client = callback.from_user.id
        name_client=str(callback.from_user.url)
        x = 0
        await bot.send_message(id_admin, f'Пользователь {name_client} отправил тебе свою корзину')
        for id_product in await orm_get_user_id_to_cart(session, id_client):
            for product in await orm_get_cart(session, id_product.product_id):
                await bot.send_photo(id_admin,
                    product.image,
                    caption=f"<strong>{product.name}\
                                        </strong>\n{product.description}\nСтоимость: {round(product.price, 2)}",
                )
                x += 1
        await bot.send_message(id_admin, 'Корзина отправлена 🔝')
        await callback.answer('Корзина успешно отправлена')
        return
    if callback_data.menu_name == "add_to_cart":
        await add_to_cart(callback, callback_data, session)
        return

    media, reply_markup = await get_menu_content(
        session,
        level=callback_data.level,
        menu_name=callback_data.menu_name,
        category=callback_data.category,
        page=callback_data.page,
        product_id=callback_data.product_id,
        user_id=callback.from_user.id,
    )

    await callback.message.edit_media(media=media, reply_markup=reply_markup)
    await callback.answer()





